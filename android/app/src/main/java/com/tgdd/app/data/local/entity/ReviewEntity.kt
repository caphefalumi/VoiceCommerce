package com.tgdd.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity for product reviews.
 *
 * Table: reviews
 *
 * Sync Strategy:
 * - Data from ReviewApi network response
 * - Cached locally for offline viewing
 * - Synced on product detail view and pull-to-refresh
 *
 * Indexes:
 * - PRIMARY KEY: id
 * - INDEX: productId (for product review queries)
 * - INDEX: userId (for user review queries)
 * - INDEX: createdAt (for sorting)
 *
 * @see com.tgdd.app.data.local.dao.ReviewDao For database operations
 */
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
