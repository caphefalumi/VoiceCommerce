package com.tgdd.app.data.model

import com.google.gson.annotations.SerializedName

data class ProductDto(
    @SerializedName("id")
    val id: String,
    @SerializedName("name")
    val name: String,
    @SerializedName("price")
    val price: Double,
    @SerializedName("originalPrice")
    val originalPrice: Double? = null,
    @SerializedName("images")
    val images: List<String>? = null,
    @SerializedName("category")
    val category: String,
    @SerializedName("description")
    val description: String? = null,
    @SerializedName("rating")
    val rating: Float = 0f,
    @SerializedName("reviewCount")
    val reviewCount: Int = 0,
    @SerializedName("brand")
    val brand: String? = null,
    @SerializedName("stock")
    val stock: Int = 1,
    @SerializedName("discountPercentage")
    val discountPercentage: Int = 0,
    @SerializedName("isFlashSale")
    val isFlashSale: Boolean = false,
    @SerializedName("isNew")
    val isNew: Boolean = false,
    @SerializedName("specs")
    val specs: Map<String, String>? = null,
    @SerializedName("reviews")
    val reviews: List<ReviewDto>? = null,
    @SerializedName("url")
    val url: String? = null,
    @SerializedName("createdAt")
    val createdAt: String? = null
) {
    val inStock: Boolean
        get() = stock > 0

    fun getFirstImage(): String {
        return images?.firstOrNull() ?: ""
    }
}

data class ReviewDto(
    @SerializedName("id")
    val id: String,
    @SerializedName("userName")
    val userName: String,
    @SerializedName("rating")
    val rating: Float,
    @SerializedName("comment")
    val comment: String,
    @SerializedName("date")
    val date: String
)
