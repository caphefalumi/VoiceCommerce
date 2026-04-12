package com.tgdd.app.ui.product

import androidx.lifecycle.*
import com.google.gson.Gson
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.google.gson.JsonSyntaxException
import com.tgdd.app.data.model.AiVoiceContext
import com.tgdd.app.data.model.AiVoiceRequest
import com.tgdd.app.data.local.UserSession
import com.tgdd.app.data.local.entity.CartItemEntity
import com.tgdd.app.data.local.entity.ProductEntity
import com.tgdd.app.data.remote.AiVoiceApi
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

@HiltViewModel
class ProductListViewModel @Inject constructor(
    private val productRepository: ProductRepository,
    private val cartRepository: CartRepository,
    private val userSession: UserSession,
    private val aiVoiceApi: AiVoiceApi,
    private val voiceAssistantManager: VoiceAssistantManager
) : ViewModel() {

    private val gson = Gson()

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
    val assistantResponse: LiveData<String?> = _assistantResponse

    private val _navigateToCheckout = MutableLiveData<Boolean>(false)
    val navigateToCheckout: LiveData<Boolean> = _navigateToCheckout

    private val _isRecording = MutableLiveData<Boolean>(false)
    val isRecording: LiveData<Boolean> = _isRecording

    private var recordingJob: Job? = null
    private var audioOutputStream: java.io.ByteArrayOutputStream? = null

    private var currentCategory: String? = null
    private var currentBrand: String? = null
    private var _allProducts: List<ProductEntity> = emptyList()
    private var searchJob: Job? = null
    private var lastSearchQuery: String = ""
    private val searchCache = mutableMapOf<String, List<ProductEntity>>()

    init {
        loadProducts()
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

    fun searchProducts(query: String) {
        // Cancel previous search
        searchJob?.cancel()
        
        val trimmedQuery = query.trim()
        
        // Return early if query is too short
        if (trimmedQuery.length < 2) {
            _products.value = _allProducts
            return
        }
        
        // Check cache first
        if (searchCache.containsKey(trimmedQuery)) {
            _products.value = searchCache[trimmedQuery]
            lastSearchQuery = trimmedQuery
            return
        }
        
        searchJob = viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            
            try {
                // Add slight delay for debouncing
                delay(100)
                
                val result = productRepository.searchProducts(trimmedQuery)
                
                result.fold(
                    onSuccess = { results ->
                        // Cache the results
                        searchCache[trimmedQuery] = results
                        
                        // Limit cache size to prevent memory issues
                        if (searchCache.size > 20) {
                            val oldestKey = searchCache.keys.first()
                            searchCache.remove(oldestKey)
                        }
                        
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
                val cartItem = CartItemEntity(
                    productId = product.id,
                    name = product.name,
                    image = product.image,
                    price = product.price,
                    quantity = quantity
                )
                cartRepository.addToCart(cartItem)
                _addedToCart.value = true
                _addedToCartMessage.value = "Đã thêm ${product.name} vào giỏ hàng"
            } catch (e: Exception) {
                _error.value = e.message ?: "Failed to add to cart"
            }
        }
    }

    fun processVoiceCommand(spokenText: String) {
        if (spokenText.isBlank()) {
            _error.value = "Không nghe rõ nội dung"
            return
        }

        viewModelScope.launch {
            try {
                val response = aiVoiceApi.processVoice(
                    AiVoiceRequest(
                        text = spokenText,
                        sessionId = "android-${System.currentTimeMillis()}",
                        context = AiVoiceContext(userId = userSession.getUserId())
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

                _assistantResponse.value = body.responseText?.takeIf { it.isNotBlank() }
                    ?: body.error
                    ?: "Đã xử lý lệnh giọng nói"

                handleAiAction(body.action)
            } catch (e: Exception) {
                _error.value = e.message ?: "Không thể xử lý giọng nói"
            }
        }
    }

    private suspend fun handleAiAction(actionElement: JsonElement?) {
        val actionObject = parseActionObject(actionElement) ?: return
        val actionType = actionObject.getAsJsonPrimitive("type")?.asString
            ?: actionObject.getAsJsonPrimitive("action")?.asString
            ?: return

        when (actionType.lowercase()) {
            "add_to_cart", "remove_from_cart", "update_cart", "view_cart", "list_cart" -> {
                cartRepository.syncCart()
            }

            "checkout_start", "checkout_review", "checkout_complete", "navigate_checkout" -> {
                _navigateToCheckout.value = true
            }
        }
    }

    private fun parseActionObject(actionElement: JsonElement?): JsonObject? {
        if (actionElement == null || actionElement.isJsonNull) return null
        return try {
            when {
                actionElement.isJsonObject -> actionElement.asJsonObject
                actionElement.isJsonPrimitive && actionElement.asJsonPrimitive.isString -> {
                    gson.fromJson(actionElement.asString, JsonObject::class.java)
                }
                else -> null
            }
        } catch (_: JsonSyntaxException) {
            null
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

    fun toggleVoiceRecording() {
        if (_isRecording.value == true) {
            stopVoiceRecording()
        } else {
            startVoiceRecording()
        }
    }

    private fun startVoiceRecording() {
        recordingJob = viewModelScope.launch {
            try {
                _isRecording.value = true
                audioOutputStream = voiceAssistantManager.startRecording()
            } catch (e: Exception) {
                _error.value = "Không thể bắt đầu ghi âm: ${e.message}"
                _isRecording.value = false
            }
        }
    }

    private fun stopVoiceRecording() {
        recordingJob?.cancel()
        voiceAssistantManager.stopRecording()
        _isRecording.value = false

        audioOutputStream?.let { stream ->
            val audioData = stream.toByteArray()
            processVoiceInput(audioData)
        }
        audioOutputStream = null
    }

    private fun processVoiceInput(audioData: ByteArray) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val result = voiceAssistantManager.processVoiceInput(
                    audioData = audioData,
                    userId = userSession.getUserId()
                )

                result.fold(
                    onSuccess = { response ->
                        _assistantResponse.value = response.text
                        
                        // Handle navigation
                        if (response.navigate_to == "checkout") {
                            _navigateToCheckout.value = true
                        }
                        
                        // Handle intent-based actions
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
            }
        }
    }

    private suspend fun handleVoiceIntent(intent: String) {
        when (intent.lowercase()) {
            "add_to_cart", "cart_add" -> {
                cartRepository.syncCart()
            }
            "checkout", "navigate_checkout" -> {
                _navigateToCheckout.value = true
            }
            "search", "search_product" -> {
                // Search is handled by the AI response text
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        voiceAssistantManager.stopRecording()
        voiceAssistantManager.stopAudioPlayback()
    }
}
