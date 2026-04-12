package com.tgdd.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity for user wishlist items.
 *
 * Table: wishlist
 *
 * Sync Strategy:
 * - Local-only storage for wishlist
 * - Synced to server when user logs in
 * - Available offline for quick access
 *
 * Indexes:
 * - PRIMARY KEY: id (auto-generated)
 * - INDEX: productId (for uniqueness checks)
 * - INDEX: addedAt (for sorting)
 *
 * @see com.tgdd.app.data.local.dao.WishlistDao For database operations
 */
@Entity(tableName = "wishlist")
data class WishlistEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val productId: String,
    val name: String,
    val image: String,
    val price: Double,
    val originalPrice: Double?,
    val rating: Double,
    val addedAt: Long = System.currentTimeMillis()
)
