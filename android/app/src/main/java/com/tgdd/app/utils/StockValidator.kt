package com.tgdd.app.utils

import com.tgdd.app.data.local.entity.CartItemEntity
import com.tgdd.app.data.local.entity.ProductEntity

/**
 * Utility object for validating product stock availability.
 * Ensures cart items are in stock before checkout.
 */
object StockValidator {
    
    /**
     * Result of stock validation containing status and any problematic items.
     */
    data class StockValidationResult(
        /** Whether all cart items are in stock */
        val isValid: Boolean,
        /** List of product names that are out of stock */
        val outOfStockItems: List<String> = emptyList(),
        /** List of product names with low stock (productName to available quantity) */
        val lowStockItems: List<Pair<String, Int>> = emptyList()
    )

    /**
     * Validates all cart items against product inventory.
     * Checks if items in cart are available and in stock.
     * 
     * @param cartItems List of cart items to validate
     * @param products Map of productId to ProductEntity for stock lookup
     * @return StockValidationResult with validation status and any out-of-stock items
     * 
     * @example
     * ```
     * val result = validateCartStock(cartItems, productsMap)
     * if (!result.isValid) {
     *     showOutOfStockWarning(result.outOfStockItems)
     * }
     * ```
     * 
     * Edge cases:
     * - Returns valid if cartItems is empty
     * - Returns invalid if product not found in products map
     * - Returns invalid if product.inStock is false
     */
    fun validateCartStock(
        cartItems: List<CartItemEntity>,
        products: Map<String, ProductEntity>
    ): StockValidationResult {
        val outOfStock = mutableListOf<String>()
        val lowStock = mutableListOf<Pair<String, Int>>()

        cartItems.forEach { cartItem ->
            val product = products[cartItem.productId]
            // Product not found in inventory = out of stock
            if (product == null || !product.inStock) {
                outOfStock.add(cartItem.name)
            }
            // Note: Quantity field not available in ProductEntity
            // Low stock detection is placeholder for future implementation
        }

        return StockValidationResult(
            isValid = outOfStock.isEmpty(),
            outOfStockItems = outOfStock,
            lowStockItems = lowStock
        )
    }

    /**
     * Checks if available quantity indicates low stock.
     * 
     * @param availableQuantity Current stock quantity
     * @param threshold Low stock threshold (default 5)
     * @return true if quantity is between 1 and threshold (inclusive)
     * 
     * @example
     * ```
     * isLowStock(3)     // true (threshold default 5)
     * isLowStock(5)     // true
     * isLowStock(6)     // false
     * isLowStock(0)     // false (0 is out of stock, not low)
     * ```
     */
    fun isLowStock(availableQuantity: Int, threshold: Int = 5): Boolean {
        return availableQuantity in 1..threshold
    }

    /**
     * Gets stock status for a product.
     * 
     * @param product Product entity to check
     * @return StockStatus enum (IN_STOCK, LOW_STOCK, or OUT_OF_STOCK)
     * 
     * @example
     * ```
     * val status = getStockStatus(productEntity)
     * when (status) {
     *     StockStatus.IN_STOCK -> showAddToCart()
     *     StockStatus.OUT_OF_STOCK -> showOutOfStock()
     *     StockStatus.LOW_STOCK -> showLimitedStock()
     * }
     * ```
     */
    fun getStockStatus(product: ProductEntity): StockStatus {
        return when {
            !product.inStock -> StockStatus.OUT_OF_STOCK
            else -> StockStatus.IN_STOCK
        }
    }

    /**
     * Stock availability status enum.
     */
    enum class StockStatus {
        /** Product is available */
        IN_STOCK,
        /** Product quantity is low */
        LOW_STOCK,
        /** Product is not available */
        OUT_OF_STOCK
    }
}