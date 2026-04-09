package com.tgdd.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "reviews")
data class ReviewEntity(
    @PrimaryKey
    val id: String,
    val productId: String,
    val userId: String,
    val userName: String,
    val rating: Int,
    val comment: String,
    val images: String = "", // JSON array of image URLs
    val helpfulCount: Int = 0,
    val createdAt: Long = System.currentTimeMillis(),
    val isVerifiedPurchase: Boolean = false
)
