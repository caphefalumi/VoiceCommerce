package com.tgdd.app.data.model

data class CartItemDto(
    val id: String? = null,
    val productId: String? = null,
    val name: String? = null,
    val images: List<String>? = null,
    val price: Double = 0.0,
    val quantity: Int = 0
) {
    fun getImage(): String = images?.firstOrNull() ?: ""
}
