package com.tgdd.app.data.model

import com.google.gson.annotations.SerializedName

/**
 * Data Transfer Object for Cart Item from API.
 *
 * Maps to: GET /api/v1/cart
 *
 * Example JSON:
 * {
 *   "id": "cart_item_123",
 *   "product_id": "prod_456",
 *   "name": "iPhone 15 Pro",
 *   "images": ["https://example.com/iphone.jpg"],
 *   "price": 999000.0,
 *   "quantity": 2
 * }
 *
 * @property id Cart item ID
 * @property productId Associated product ID
 * @property name Product name at time of adding to cart
 * @property images Product images
 * @property price Unit price in VND
 * @property quantity Quantity of this item
 *
 * @see CartItem For Room database entity
 */
data class CartItemDto(
    @SerializedName("id")
    val id: String? = null,
    @SerializedName("product_id")
    val productId: String? = null,
    @SerializedName("name")
    val name: String? = null,
    @SerializedName("images")
    val images: List<String>? = null,
    @SerializedName("price")
    val price: Double = 0.0,
    @SerializedName("quantity")
    val quantity: Int = 0
) {
    fun getImage(): String = images?.firstOrNull() ?: ""
}
