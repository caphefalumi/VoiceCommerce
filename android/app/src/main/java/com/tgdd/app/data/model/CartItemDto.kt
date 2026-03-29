package com.tgdd.app.data.model

import com.google.gson.annotations.SerializedName

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
