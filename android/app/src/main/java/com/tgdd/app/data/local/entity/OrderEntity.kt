package com.tgdd.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity for order data.
 *
 * Table: orders
 *
 * Sync Strategy:
 * - Data from OrderApi network response
 * - Stored locally for offline order history viewing
 * - Synced when user views orders
 *
 * Indexes:
 * - PRIMARY KEY: id
 * - INDEX: userId (for user order queries)
 * - INDEX: createdAt (for sorting)
 *
 * @see com.tgdd.app.data.local.dao.OrderDao For database operations
 */
@Entity(tableName = "orders")
data class OrderEntity(
    @PrimaryKey
    val id: String,
    val userId: String,
    val items: String,
    val total: Double,
    val status: String,
    val address: String,
    val customerName: String,
    val customerPhone: String,
    val paymentMethod: String,
    val createdAt: Long = System.currentTimeMillis()
)
