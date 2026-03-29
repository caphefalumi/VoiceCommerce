package com.tgdd.app.ui.product

import androidx.lifecycle.*
import com.tgdd.app.data.local.entity.ProductEntity
import com.tgdd.app.data.repository.ProductRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ProductListViewModel @Inject constructor(
    private val productRepository: ProductRepository
) : ViewModel() {

    private val _products = MutableLiveData<List<ProductEntity>>()
    val products: LiveData<List<ProductEntity>> = _products

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    private var currentCategory: String? = null
    private var currentBrand: String? = null
    private var _allProducts: List<ProductEntity> = emptyList()
    private var filterMinPrice: Double? = null
    private var filterMaxPrice: Double? = null

    private fun applyFilters() {
        var filtered = _allProducts
        filterMinPrice?.let { min -> filtered = filtered.filter { it.price >= min } }
        filterMaxPrice?.let { max -> filtered = filtered.filter { it.price <= max } }
        _products.value = filtered
    }

    fun setFilter(minPrice: Double?, maxPrice: Double?) {
        filterMinPrice = minPrice
        filterMaxPrice = maxPrice
        applyFilters()
    }

    fun clearFilters() {
        filterMinPrice = null
        filterMaxPrice = null
        applyFilters()
    }

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

    fun searchProducts(query: String) {
        viewModelScope.launch {
            _isLoading.value = true
            productRepository.searchProducts(query).fold(
                onSuccess = { results ->
                    _allProducts = results
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
