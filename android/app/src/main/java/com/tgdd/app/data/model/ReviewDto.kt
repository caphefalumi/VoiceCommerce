package com.tgdd.app.data.model

data class ReviewDto(
    val id: String?,
    val productId: String?,
    val userId: String?,
    val userName: String?,
    val rating: Int,
    val comment: String?,
    val images: List<String>? = null,
    val helpfulCount: Int = 0,
    val createdAt: Long? = null,
    val isVerifiedPurchase: Boolean = false
)
