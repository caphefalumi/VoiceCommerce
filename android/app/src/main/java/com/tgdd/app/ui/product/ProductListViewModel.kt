package com.tgdd.app.ui.product

import androidx.lifecycle.*
import com.tgdd.app.data.local.entity.ProductEntity
import com.tgdd.app.data.repository.ProductRepository
import com.tgdd.app.utils.ProductFilter
import com.tgdd.app.utils.ProductFilterUtils
import com.tgdd.app.utils.SortOption
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ProductListViewModel @Inject constructor(
    private val productRepository: ProductRepository
) : ViewModel() {

    private val _products = MutableLiveData<List<ProductEntity>>()
    val products: LiveData<List<ProductEntity>> = _products

    private val _filteredProducts = MutableLiveData<List<ProductEntity>>()
    val filteredProducts: LiveData<List<ProductEntity>> = _filteredProducts

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    private val _currentFilter = MutableLiveData<ProductFilter>(ProductFilter())
    val currentFilter: LiveData<ProductFilter> = _currentFilter

    private val _availableCategories = MutableLiveData<List<String>>(emptyList())
    val availableCategories: LiveData<List<String>> = _availableCategories

    private val _availableBrands = MutableLiveData<List<String>>(emptyList())
    val availableBrands: LiveData<List<String>> = _availableBrands

    private val _priceRange = MutableLiveData<Pair<Double, Double>?>(null)
    val priceRange: LiveData<Pair<Double, Double>?> = _priceRange

    private var currentCategory: String? = null
    private var currentBrand: String? = null
    private var _allProducts: List<ProductEntity> = emptyList()

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
        viewModelScope.launch {
            _isLoading.value = true
            productRepository.searchProducts(query).fold(
                onSuccess = { results ->
                    _allProducts = results
                    _products.value = results
                    initializeFilterOptions(results)
                    applyFilters()
                    _isLoading.value = false
                },
                onFailure = { e ->
                    _error.value = e.message
                    _isLoading.value = false
                }
            )
        }
    }

    fun refreshProducts() {
        loadProducts(currentCategory, currentBrand)
    }

    fun clearCache() {
        viewModelScope.launch {
            productRepository.clearCache()
        }
    }

    fun clearError() {
        _error.value = null
    }
}
