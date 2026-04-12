package com.tgdd.app.data.model

import com.google.gson.annotations.SerializedName

data class ReviewDto(
    @SerializedName("id")
    val id: String?,
    @SerializedName("product_id")
    val productId: String?,
    @SerializedName("user_id")
    val userId: String?,
    @SerializedName("user_name")
    val userName: String?,
    @SerializedName("rating")
    val rating: Int,
    @SerializedName("comment")
    val comment: String?,
    @SerializedName("images")
    val images: List<String>? = null,
    @SerializedName("helpful_count")
    val helpfulCount: Int = 0,
    @SerializedName("created_at")
    val createdAt: String? = null,
    @SerializedName("verified_purchase")
    val isVerifiedPurchase: Boolean = false
)
