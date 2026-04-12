package com.tgdd.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity for product data caching.
 *
 * Table: products
 *
 * Sync Strategy:
 * - Data from ProductApi network response
 * - Stored locally for offline access
 * - Synced on app start and pull-to-refresh
 *
 * Indexes:
 * - PRIMARY KEY: id
 *
 * @see com.tgdd.app.data.local.dao.ProductDao For database operations
 */
@Entity(tableName = "products")
data class ProductEntity(
    @PrimaryKey
    val id: String,
    val name: String,
    val price: Double,
    val originalPrice: Double? = null,
    val image: String,
    val category: String,
    val description: String,
    val rating: Float = 0f,
    val reviewCount: Int = 0,
    val brand: String? = null,
    val inStock: Boolean = true,
    val createdAt: Long = System.currentTimeMillis()
)
