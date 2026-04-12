package com.tgdd.app.ui.product

import androidx.lifecycle.*
import com.google.gson.Gson
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.google.gson.JsonSyntaxException
import com.tgdd.app.data.model.VoiceRequest
import com.tgdd.app.data.local.UserSession
import com.tgdd.app.data.local.entity.ProductEntity
import com.tgdd.app.data.remote.VoiceApi
import com.tgdd.app.data.repository.CartRepository
import com.tgdd.app.data.repository.ProductRepository
import com.tgdd.app.data.repository.VoiceAssistantManager
import com.tgdd.app.utils.ProductFilter
import com.tgdd.app.utils.ProductFilterUtils
import com.tgdd.app.utils.SortOption
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import javax.inject.Inject

/**
 * ViewModel for product list screen.
 *
 * Responsibilities:
 * - Fetch products from repository (all, by category, by brand)
 * - Handle voice command processing via AI Voice API
 * - Manage search with debouncing and caching
 * - Apply filters (category, brand, price range, rating, stock)
 * - Add products to cart with login check
 * - Voice recording and playback management
 *
 * UI State:
 * - products: List<ProductEntity> - Current product list (raw from API)
 * - filteredProducts: List<ProductEntity> - Products after filter application
 * - isLoading: Boolean - Loading indicator for API calls
 * - error: String? - Error message for display
 * - addedToCart: Boolean - Success flag for cart operations
 * - currentFilter: ProductFilter - Current filter state
 * - assistantResponse: String? - AI voice assistant response text
 * - isRecording: Boolean - Voice recording state
 * - navigateToCheckout: Boolean - Navigation trigger
 *
 * Voice AI Integration:
 * - processVoiceCommand: Sends text commands to AI Voice API
 * - toggleVoiceRecording: Starts/stops microphone recording
 *
 * @see ProductListFragment For UI binding
 * @see ProductRepository For data fetching
 * @see VoiceAssistantManager For audio recording/playback
 */
@HiltViewModel
class ProductListViewModel @Inject constructor(
    private val productRepository: ProductRepository,
    private val cartRepository: CartRepository,
    private val userSession: UserSession,
    private val voiceApi: VoiceApi,
    private val voiceAssistantManager: VoiceAssistantManager
) : ViewModel() {

    private val gson = Gson()

    // UI State - Exposed to Fragment for data binding
    private val _products = MutableLiveData<List<ProductEntity>>()
    val products: LiveData<List<ProductEntity>> = _products

    private val _filteredProducts = MutableLiveData<List<ProductEntity>>()
    val filteredProducts: LiveData<List<ProductEntity>> = _filteredProducts

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    private val _addedToCart = MutableLiveData<Boolean>()
    val addedToCart: LiveData<Boolean> = _addedToCart

    private val _addedToCartMessage = MutableLiveData<String?>()
    val addedToCartMessage: LiveData<String?> = _addedToCartMessage

    private val _requireLogin = MutableLiveData<Boolean>()
    val requireLogin: LiveData<Boolean> = _requireLogin

    private val _currentFilter = MutableLiveData<ProductFilter>(ProductFilter())
    val currentFilter: LiveData<ProductFilter> = _currentFilter

    private val _availableCategories = MutableLiveData<List<String>>(emptyList())
    val availableCategories: LiveData<List<String>> = _availableCategories

    private val _availableBrands = MutableLiveData<List<String>>(emptyList())
    val availableBrands: LiveData<List<String>> = _availableBrands

    private val _priceRange = MutableLiveData<Pair<Double, Double>?>(null)
    val priceRange: LiveData<Pair<Double, Double>?> = _priceRange

    private val _assistantResponse = MutableLiveData<String?>()
    /** AI voice assistant response text for TTS playback */
    val assistantResponse: LiveData<String?> = _assistantResponse

    private val _navigateToCheckout = MutableLiveData<Boolean>(false)
    val navigateToCheckout: LiveData<Boolean> = _navigateToCheckout

    private val _isRecording = MutableLiveData<Boolean>(false)
    val isRecording: LiveData<Boolean> = _isRecording

    private val _isProcessingVoice = MutableLiveData<Boolean>(false)
    val isProcessingVoice: LiveData<Boolean> = _isProcessingVoice

    // Internal state - Not exposed to UI
    private var audioOutputStream: java.io.ByteArrayOutputStream? = null

    // Product list state
    private var currentCategory: String? = null
    private var currentBrand: String? = null
    private var _allProducts: List<ProductEntity> = emptyList()

    // Search state with caching
    private var searchJob: Job? = null
    private var lastSearchQuery: String = ""
    private val searchCache = mutableMapOf<String, List<ProductEntity>>()

    /**
     * Gets current displayed products as SearchResult for voice context.
     * Returns up to 10 products with index, id, name, and price.
     */
    fun getCurrentSearchResults(): List<com.tgdd.app.data.model.SearchResult> {
        val products = _filteredProducts.value ?: emptyList()
        return products.take(10).mapIndexed { index, product ->
            com.tgdd.app.data.model.SearchResult(
                id = product.id,
                name = product.name,
                price = product.price,
                index = index + 1
            )
        }
    }

    fun loadProducts(category: String? = null, brand: String? = null) {
        currentCategory = category
        currentBrand = brand
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            val result = when {
                !category.isNullOrBlank() -> productRepository.getProductsByCategory(category)
                !brand.isNullOrBlank() -> productRepository.getProductsByBrand(brand)
                else -> productRepository.getProducts()
            }
            result.fold(
                onSuccess = { productList ->
                    _allProducts = productList
                    _products.value = productList
                    initializeFilterOptions(productList)
                    applyFilters()
                    _isLoading.value = false
                },
                onFailure = { e ->
                    _error.value = e.message ?: "Unknown error"
                    _isLoading.value = false
                }
            )
        }
    }

    private fun initializeFilterOptions(products: List<ProductEntity>) {
        _availableCategories.value = ProductFilterUtils.extractCategories(products)
        _availableBrands.value = ProductFilterUtils.extractBrands(products)
        _priceRange.value = ProductFilterUtils.getPriceRange(products)
    }

    fun applyFilter(filter: ProductFilter) {
        _currentFilter.value = filter
        applyFilters()
    }

    /**
     * Applies current filter to product list.
     * Uses ProductFilterUtils to filter _allProducts and updates _filteredProducts.
     */
    private fun applyFilters() {
        val filter = _currentFilter.value ?: ProductFilter()
        _filteredProducts.value = ProductFilterUtils.applyFilter(_allProducts, filter)
    }

    fun setSortOption(sortOption: SortOption) {
        val currentFilter = _currentFilter.value ?: ProductFilter()
        _currentFilter.value = currentFilter.copy(sortBy = sortOption)
        applyFilters()
    }

    fun setPriceRange(min: Double?, max: Double?) {
        val currentFilter = _currentFilter.value ?: ProductFilter()
        _currentFilter.value = currentFilter.copy(minPrice = min, maxPrice = max)
        applyFilters()
    }

    fun toggleCategory(category: String) {
        val currentFilter = _currentFilter.value ?: ProductFilter()
        val categories = currentFilter.categories.toMutableList()
        if (categories.contains(category)) {
            categories.remove(category)
        } else {
            categories.add(category)
        }
        _currentFilter.value = currentFilter.copy(categories = categories)
        applyFilters()
    }

    fun toggleBrand(brand: String) {
        val currentFilter = _currentFilter.value ?: ProductFilter()
        val brands = currentFilter.brands.toMutableList()
        if (brands.contains(brand)) {
            brands.remove(brand)
        } else {
            brands.add(brand)
        }
        _currentFilter.value = currentFilter.copy(brands = brands)
        applyFilters()
    }

    fun setMinRating(rating: Double?) {
        val currentFilter = _currentFilter.value ?: ProductFilter()
        _currentFilter.value = currentFilter.copy(minRating = rating)
        applyFilters()
    }

    fun setInStockOnly(inStockOnly: Boolean) {
        val currentFilter = _currentFilter.value ?: ProductFilter()
        _currentFilter.value = currentFilter.copy(inStockOnly = inStockOnly)
        applyFilters()
    }

    fun clearFilters() {
        _currentFilter.value = ProductFilter()
        applyFilters()
    }

    /**
     * Searches products with debouncing and caching.
     *
     * Performance optimizations:
     * - Debounce: 100ms delay to avoid excessive API calls
     * - Cache: Stores up to 20 recent search results
     * - Minimum query length: 2 characters
     *
     * Flow: query → API → cache → _allProducts → applyFilters → _filteredProducts
     */
    fun searchProducts(query: String) {
        // Cancel previous search to prevent race conditions
        searchJob?.cancel()
        
        val trimmedQuery = query.trim()
        
        // Return early if query is too short (minimum 2 chars)
        if (trimmedQuery.length < 2) {
            _products.value = _allProducts
            return
        }
        
        // Check cache first to avoid unnecessary API calls
        if (searchCache.containsKey(trimmedQuery)) {
            _products.value = searchCache[trimmedQuery]
            lastSearchQuery = trimmedQuery
            return
        }
        
        searchJob = viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            
            try {
                // Debounce: slight delay to batch rapid keystrokes
                delay(100)
                
                val result = productRepository.searchProducts(trimmedQuery)
                
                result.fold(
                    onSuccess = { results ->
                        // Cache the results for future searches
                        searchCache[trimmedQuery] = results
                        
                        // LRU eviction: limit cache to 20 entries to prevent memory issues
                        if (searchCache.size > 20) {
                            val oldestKey = searchCache.keys.first()
                            searchCache.remove(oldestKey)
                        }
                        
                        // Update product lists and re-apply filters
                        _allProducts = results
                        _products.value = results
                        lastSearchQuery = trimmedQuery
                        initializeFilterOptions(results)
                        applyFilters()
                        _isLoading.value = false
                    },
                    onFailure = { e ->
                        _error.value = e.message ?: "Tìm kiếm thất bại"
                        _isLoading.value = false
                    }
                )
            } catch (e: Exception) {
                // Ignore CancellationException from cancelled coroutines
                if (e !is kotlinx.coroutines.CancellationException) {
                    _error.value = e.message ?: "Lỗi không xác định"
                    _isLoading.value = false
                }
            }
        }
    }

    fun refreshProducts() {
        searchCache.clear()
        lastSearchQuery = ""
        loadProducts(currentCategory, currentBrand)
    }

    fun clearCache() {
        viewModelScope.launch {
            searchCache.clear()
            productRepository.clearCache()
        }
    }

    fun clearError() {
        _error.value = null
    }

    fun addToCart(product: ProductEntity, quantity: Int = 1) {
        if (!userSession.isLoggedIn()) {
            _requireLogin.value = true
            return
        }
        viewModelScope.launch {
            try {
                val result = cartRepository.addToCart(product.id, quantity)
                if (result.isSuccess) {
                    // Set message first, then trigger the added flag
                    _addedToCartMessage.value = "Đã thêm ${product.name} vào giỏ hàng"
                    _addedToCart.value = true
                } else {
                    _error.value = result.exceptionOrNull()?.message ?: "Failed to add to cart"
                }
            } catch (e: Exception) {
                _error.value = e.message ?: "Failed to add to cart"
            }
        }
    }

    /**
     * Processes voice command via AI Voice API.
     *
     * Voice Command Flow:
     * 1. Send spoken text to AI Voice API with user context
     * 2. Receive AI response with action and text
     * 3. Display response via TTS (_assistantResponse)
     * 4. Execute action if specified (cart sync, checkout navigation)
     *
     * Supported Actions:
     * - add_to_cart, remove_from_cart, update_cart, view_cart, list_cart
     * - checkout_start, checkout_review, checkout_complete, navigate_checkout
     *
     * @param spokenText Raw text from voice recognition
     */
    fun processVoiceCommand(spokenText: String) {
        if (spokenText.isBlank()) {
            _error.value = "Could not hear clearly"
            return
        }

        viewModelScope.launch {
            try {
                // Send voice command to AI with session context
                val response = voiceApi.processVoice(
                    VoiceRequest(
                        text = spokenText,
                        session_id = "android-${System.currentTimeMillis()}",
                        user_id = userSession.getUserId()
                    )
                )

                if (!response.isSuccessful) {
                    _error.value = "AI request failed: ${response.code()}"
                    return@launch
                }

                val body = response.body()
                if (body == null) {
                    _error.value = "AI response is empty"
                    return@launch
                }

                // Extract response text for display
                _assistantResponse.value = body.text

                // Handle navigation if specified
                body.navigate_to?.let { destination ->
                    when (destination) {
                        "checkout" -> _navigateToCheckout.value = true
                    }
                }
            } catch (e: Exception) {
                _error.value = e.message ?: "Unable to process voice"
            }
        }
    }

    fun clearAssistantResponse() {
        _assistantResponse.value = null
    }

    fun onNavigatedToCheckout() {
        _navigateToCheckout.value = false
    }

    fun resetAddedToCart() { _addedToCart.value = false }
    fun clearAddedToCartMessage() { _addedToCartMessage.value = null }
    fun resetRequireLogin() { _requireLogin.value = false }

    /**
     * Toggles voice recording state.
     * If currently recording, stops and processes audio.
     * If not recording, starts microphone capture.
     * Prevents toggling while processing voice input.
     */
    fun toggleVoiceRecording() {
        // Prevent interaction while processing AI response
        if (_isProcessingVoice.value == true) {
            return
        }
        
        if (_isRecording.value == true) {
            stopVoiceRecording()
        } else {
            startVoiceRecording()
        }
    }

    /**
     * Starts audio recording via VoiceAssistantManager.
     * Captures microphone input into ByteArrayOutputStream.
     */
    private fun startVoiceRecording() {
        try {
            android.util.Log.d("ProductListViewModel", "Starting voice recording...")
            _isRecording.value = true
            audioOutputStream = voiceAssistantManager.startRecording()
            android.util.Log.d("ProductListViewModel", "Voice recording started successfully")
        } catch (e: Exception) {
            android.util.Log.e("ProductListViewModel", "Error starting recording", e)
            _error.value = "Unable to start recording: ${e.message}"
            _isRecording.value = false
        }
    }

    /**
     * Stops recording and processes captured audio.
     * Converts ByteArrayOutputStream to ByteArray and sends to voice processing.
     */
    private fun stopVoiceRecording() {
        android.util.Log.d("ProductListViewModel", "Stopping voice recording...")
        voiceAssistantManager.stopRecording()
        _isRecording.value = false

        // Set processing state SYNCHRONOUSLY before async processing
        // This ensures the UI shows loading immediately when stopping recording
        _isProcessingVoice.value = true
        _isLoading.value = true

        val audioData = audioOutputStream?.toByteArray()
        audioOutputStream = null

        if (audioData != null && audioData.isNotEmpty()) {
            android.util.Log.d("ProductListViewModel", "Audio data size: ${audioData.size} bytes")
            processVoiceInput(audioData)
        } else {
            android.util.Log.e("ProductListViewModel", "No audio data captured!")
            _error.value = "No audio data"
            // Reset processing state since processVoiceInput won't be called
            _isProcessingVoice.value = false
            _isLoading.value = false
        }
    }

    /**
     * Processes raw audio data through VoiceAssistantManager.
     * Handles navigation intents and action triggers from voice recognition.
     *
     * Response handling:
     * - text: Sent to TTS for audio playback
     * - navigate_to: Triggers UI navigation (e.g., checkout)
     * - intent: Maps to business logic (cart, checkout actions)
     */
    private fun processVoiceInput(audioData: ByteArray) {
        viewModelScope.launch {
            _isProcessingVoice.value = true
            _isLoading.value = true
            try {
                // Get current search results for voice context
                val searchResults = getCurrentSearchResults()
                
                val result = voiceAssistantManager.processVoiceInput(
                    audioData = audioData,
                    userId = userSession.getUserId(),
                    searchResults = searchResults
                )

                result.fold(
                    onSuccess = { response ->
                        // Send text to TTS for audio feedback
                        _assistantResponse.value = response.text
                        
                        // Handle explicit navigation from AI
                        if (response.navigate_to == "checkout") {
                            _navigateToCheckout.value = true
                        }
                        
                        // Process intent-based business actions
                        response.intent?.let { intent ->
                            handleVoiceIntent(intent)
                        }
                    },
                    onFailure = { e ->
                        _error.value = "Lỗi xử lý giọng nói: ${e.message}"
                    }
                )
            } catch (e: Exception) {
                _error.value = "Lỗi: ${e.message}"
            } finally {
                _isLoading.value = false
                _isProcessingVoice.value = false
            }
        }
    }

    /**
     * Maps voice intents to business logic actions.
     * Intents are extracted from voice recognition response.
     */
    private suspend fun handleVoiceIntent(intent: String) {
        when (intent.lowercase()) {
            "add_to_cart", "cart_add" -> cartRepository.syncCart()
            "checkout", "navigate_checkout" -> _navigateToCheckout.value = true
            "search", "search_product" -> { /* Handled by AI response text */ }
        }
    }

    /** Cleanup: Stop any ongoing recording/playback when ViewModel is destroyed */
    override fun onCleared() {
        super.onCleared()
        voiceAssistantManager.stopRecording()
        voiceAssistantManager.stopAudioPlayback()
    }
}
