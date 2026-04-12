package com.tgdd.app.utils

import com.tgdd.app.data.local.entity.ProductEntity

/**
 * Filter criteria for product listing.
 * 
 * @param minPrice Minimum price (inclusive), null to skip
 * @param maxPrice Maximum price (inclusive), null to skip
 * @param categories List of categories to match (OR logic)
 * @param brands List of brands to match (OR logic)
 * @param minRating Minimum rating (0-5), null to skip
 * @param inStockOnly Only show in-stock products
 * @param sortBy Sort order
 */
data class ProductFilter(
    val minPrice: Double? = null,
    val maxPrice: Double? = null,
    val categories: List<String> = emptyList(),
    val brands: List<String> = emptyList(),
    val minRating: Double? = null,
    val inStockOnly: Boolean = false,
    val sortBy: SortOption = SortOption.RELEVANCE
)

/**
 * Sort options for product listing.
 */
enum class SortOption {
    /** Default relevance order */
    RELEVANCE,
    /** Price: low to high */
    PRICE_LOW_TO_HIGH,
    /** Price: high to low */
    PRICE_HIGH_TO_LOW,
    /** Rating: high to low */
    RATING_HIGH_TO_LOW,
    /** Newest first */
    NEWEST,
    /** Name: A to Z */
    NAME_A_TO_Z
}

/**
 * Utility object for filtering and sorting products.
 */
object ProductFilterUtils {
    
    /**
     * Applies all filter criteria to product list.
     * Filters are applied in order: price -> categories -> brands -> rating -> stock -> sort
     * 
     * @param products Original product list
     * @param filter Filter criteria to apply
     * @return Filtered and sorted product list
     * 
     * @example
     * ```
     * val filter = ProductFilter(
     *     minPrice = 1000000.0,
     *     maxPrice = 5000000.0,
     *     categories = listOf("Phone", "Tablet"),
     *     inStockOnly = true,
     *     sortBy = SortOption.PRICE_LOW_TO_HIGH
     * )
     * val filtered = applyFilter(allProducts, filter)
     * ```
     */
    fun applyFilter(products: List<ProductEntity>, filter: ProductFilter): List<ProductEntity> {
        var filtered = products

        // Filter by price range (inclusive)
        filter.minPrice?.let { min ->
            filtered = filtered.filter { it.price >= min }
        }
        filter.maxPrice?.let { max ->
            filtered = filtered.filter { it.price <= max }
        }

        // Filter by categories (matches any selected category)
        if (filter.categories.isNotEmpty()) {
            filtered = filtered.filter { product ->
                filter.categories.any { category ->
                    product.category.equals(category, ignoreCase = true)
                }
            }
        }

        // Filter by brands (matches any selected brand)
        if (filter.brands.isNotEmpty()) {
            filtered = filtered.filter { product ->
                filter.brands.any { brand ->
                    product.brand?.equals(brand, ignoreCase = true) == true
                }
            }
        }

        // Filter by minimum rating
        filter.minRating?.let { minRating ->
            filtered = filtered.filter { it.rating >= minRating }
        }

        // Filter by stock availability
        if (filter.inStockOnly) {
            filtered = filtered.filter { it.inStock }
        }

        // Apply sorting
        filtered = applySorting(filtered, filter.sortBy)

        return filtered
    }

    /**
     * Sorts products by specified option.
     * 
     * @param products Products to sort
     * @param sortBy Sort option
     * @return Sorted list (new list, original unchanged)
     */
    private fun applySorting(products: List<ProductEntity>, sortBy: SortOption): List<ProductEntity> {
        return when (sortBy) {
            SortOption.PRICE_LOW_TO_HIGH -> products.sortedBy { it.price }
            SortOption.PRICE_HIGH_TO_LOW -> products.sortedByDescending { it.price }
            SortOption.RATING_HIGH_TO_LOW -> products.sortedByDescending { it.rating }
            SortOption.NAME_A_TO_Z -> products.sortedBy { it.name }
            // Original order preservation for RELEVANCE and NEWEST
            SortOption.NEWEST -> products.reversed()
            SortOption.RELEVANCE -> products
        }
    }

    /**
     * Extracts unique categories from product list.
     * 
     * @param products Source products
     * @return Sorted list of unique categories
     */
    fun extractCategories(products: List<ProductEntity>): List<String> {
        return products.map { it.category }.distinct().sorted()
    }

    /**
     * Extracts unique brands from product list.
     * 
     * @param products Source products
     * @return Sorted list of unique brands (null values excluded)
     */
    fun extractBrands(products: List<ProductEntity>): List<String> {
        return products.mapNotNull { it.brand }.distinct().sorted()
    }

    /**
     * Calculates price range from product list.
     * 
     * @param products Source products
     * @return Pair of (minPrice, maxPrice) or null if empty
     */
    fun getPriceRange(products: List<ProductEntity>): Pair<Double, Double>? {
        if (products.isEmpty()) return null
        val prices = products.map { it.price }
        return Pair(prices.minOrNull() ?: 0.0, prices.maxOrNull() ?: 0.0)
    }
}