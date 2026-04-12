package com.tgdd.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity for shopping cart items.
 *
 * Table: cart_items
 *
 * Sync Strategy:
 * - Local-only storage for cart state
 * - Synced to server on checkout
 * - Persists across app sessions
 *
 * Indexes:
 * - PRIMARY KEY: id (auto-generated)
 * - INDEX: productId (for quick lookups)
 *
 * @see com.tgdd.app.data.local.dao.CartDao For database operations
 */
@Entity(tableName = "cart_items")
data class CartItemEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val productId: String,
    val name: String,
    val image: String,
    val price: Double,
    val quantity: Int,
    val addedAt: Long = System.currentTimeMillis()
)
