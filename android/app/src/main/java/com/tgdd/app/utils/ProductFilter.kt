package com.tgdd.app.utils

import com.tgdd.app.data.local.entity.ProductEntity

data class ProductFilter(
    val minPrice: Double? = null,
    val maxPrice: Double? = null,
    val categories: List<String> = emptyList(),
    val brands: List<String> = emptyList(),
    val minRating: Double? = null,
    val inStockOnly: Boolean = false,
    val sortBy: SortOption = SortOption.RELEVANCE
)

enum class SortOption {
    RELEVANCE,
    PRICE_LOW_TO_HIGH,
    PRICE_HIGH_TO_LOW,
    RATING_HIGH_TO_LOW,
    NEWEST,
    NAME_A_TO_Z
}

object ProductFilterUtils {
    fun applyFilter(products: List<ProductEntity>, filter: ProductFilter): List<ProductEntity> {
        var filtered = products

        // Price range
        filter.minPrice?.let { min ->
            filtered = filtered.filter { it.price >= min }
        }
        filter.maxPrice?.let { max ->
            filtered = filtered.filter { it.price <= max }
        }

        // Categories
        if (filter.categories.isNotEmpty()) {
            filtered = filtered.filter { product ->
                filter.categories.any { category ->
                    product.category.equals(category, ignoreCase = true)
                }
            }
        }

        // Brands
        if (filter.brands.isNotEmpty()) {
            filtered = filtered.filter { product ->
                filter.brands.any { brand ->
                    product.brand?.equals(brand, ignoreCase = true) == true
                }
            }
        }

        // Rating
        filter.minRating?.let { minRating ->
            filtered = filtered.filter { it.rating >= minRating }
        }

        // Stock
        if (filter.inStockOnly) {
            filtered = filtered.filter { it.inStock }
        }

        // Sort
        filtered = applySorting(filtered, filter.sortBy)

        return filtered
    }

    private fun applySorting(products: List<ProductEntity>, sortBy: SortOption): List<ProductEntity> {
        return when (sortBy) {
            SortOption.PRICE_LOW_TO_HIGH -> products.sortedBy { it.price }
            SortOption.PRICE_HIGH_TO_LOW -> products.sortedByDescending { it.price }
            SortOption.RATING_HIGH_TO_LOW -> products.sortedByDescending { it.rating }
            SortOption.NAME_A_TO_Z -> products.sortedBy { it.name }
            SortOption.NEWEST -> products.reversed() // Assuming newer products are added last
            SortOption.RELEVANCE -> products // Keep original order
        }
    }

    fun extractCategories(products: List<ProductEntity>): List<String> {
        return products.map { it.category }.distinct().sorted()
    }

    fun extractBrands(products: List<ProductEntity>): List<String> {
        return products.mapNotNull { it.brand }.distinct().sorted()
    }

    fun getPriceRange(products: List<ProductEntity>): Pair<Double, Double>? {
        if (products.isEmpty()) return null
        val prices = products.map { it.price }
        return Pair(prices.minOrNull() ?: 0.0, prices.maxOrNull() ?: 0.0)
    }
}
