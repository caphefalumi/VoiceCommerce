package com.tgdd.app.ui.filter

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tgdd.app.data.local.entity.ProductEntity
import com.tgdd.app.utils.ProductFilter
import com.tgdd.app.utils.ProductFilterUtils
import com.tgdd.app.utils.SortOption
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ProductFilterViewModel @Inject constructor() : ViewModel() {

    private val _currentFilter = MutableStateFlow(ProductFilter())
    val currentFilter: StateFlow<ProductFilter> = _currentFilter.asStateFlow()

    private val _availableCategories = MutableStateFlow<List<String>>(emptyList())
    val availableCategories: StateFlow<List<String>> = _availableCategories.asStateFlow()

    private val _availableBrands = MutableStateFlow<List<String>>(emptyList())
    val availableBrands: StateFlow<List<String>> = _availableBrands.asStateFlow()

    private val _priceRange = MutableStateFlow<Pair<Double, Double>?>(null)
    val priceRange: StateFlow<Pair<Double, Double>?> = _priceRange.asStateFlow()

    fun initializeFilters(products: List<ProductEntity>) {
        viewModelScope.launch {
            _availableCategories.value = ProductFilterUtils.extractCategories(products)
            _availableBrands.value = ProductFilterUtils.extractBrands(products)
            _priceRange.value = ProductFilterUtils.getPriceRange(products)
        }
    }

    fun updatePriceRange(min: Double?, max: Double?) {
        _currentFilter.value = _currentFilter.value.copy(
            minPrice = min,
            maxPrice = max
        )
    }

    fun toggleCategory(category: String) {
        val current = _currentFilter.value.categories.toMutableList()
        if (current.contains(category)) {
            current.remove(category)
        } else {
            current.add(category)
        }
        _currentFilter.value = _currentFilter.value.copy(categories = current)
    }

    fun toggleBrand(brand: String) {
        val current = _currentFilter.value.brands.toMutableList()
        if (current.contains(brand)) {
            current.remove(brand)
        } else {
            current.add(brand)
        }
        _currentFilter.value = _currentFilter.value.copy(brands = current)
    }

    fun setMinRating(rating: Double?) {
        _currentFilter.value = _currentFilter.value.copy(minRating = rating)
    }

    fun setInStockOnly(inStockOnly: Boolean) {
        _currentFilter.value = _currentFilter.value.copy(inStockOnly = inStockOnly)
    }

    fun setSortOption(sortOption: SortOption) {
        _currentFilter.value = _currentFilter.value.copy(sortBy = sortOption)
    }

    fun clearFilters() {
        _currentFilter.value = ProductFilter()
    }

    fun applyFilter(products: List<ProductEntity>): List<ProductEntity> {
        return ProductFilterUtils.applyFilter(products, _currentFilter.value)
    }
}
