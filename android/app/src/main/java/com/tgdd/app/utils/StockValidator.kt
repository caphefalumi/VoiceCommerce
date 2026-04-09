package com.tgdd.app.utils

import com.tgdd.app.data.local.entity.CartItemEntity
import com.tgdd.app.data.local.entity.ProductEntity

object StockValidator {
    data class StockValidationResult(
        val isValid: Boolean,
        val outOfStockItems: List<String> = emptyList(),
        val lowStockItems: List<Pair<String, Int>> = emptyList() // productName to available quantity
    )

    fun validateCartStock(
        cartItems: List<CartItemEntity>,
        products: Map<String, ProductEntity>
    ): StockValidationResult {
        val outOfStock = mutableListOf<String>()
        val lowStock = mutableListOf<Pair<String, Int>>()

        cartItems.forEach { cartItem ->
            val product = products[cartItem.productId]
            if (product == null || !product.inStock) {
                outOfStock.add(cartItem.name)
            }
            // Note: We don't have quantity field in ProductEntity
            // This is a placeholder for when stock quantity is added
        }

        return StockValidationResult(
            isValid = outOfStock.isEmpty(),
            outOfStockItems = outOfStock,
            lowStockItems = lowStock
        )
    }

    fun isLowStock(availableQuantity: Int, threshold: Int = 5): Boolean {
        return availableQuantity in 1..threshold
    }

    fun getStockStatus(product: ProductEntity): StockStatus {
        return when {
            !product.inStock -> StockStatus.OUT_OF_STOCK
            else -> StockStatus.IN_STOCK
        }
    }

    enum class StockStatus {
        IN_STOCK,
        LOW_STOCK,
        OUT_OF_STOCK
    }
}
