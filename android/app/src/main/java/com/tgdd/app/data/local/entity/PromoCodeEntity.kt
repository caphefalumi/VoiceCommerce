package com.tgdd.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity for promotional codes.
 *
 * Table: promo_codes
 *
 * Sync Strategy:
 * - Data from PromoCodeApi network response
 * - Cached locally for offline discount validation
 * - Synced on app start and checkout
 *
 * Indexes:
 * - PRIMARY KEY: code
 * - INDEX: expiresAt (for filtering active codes)
 *
 * @see com.tgdd.app.data.local.dao.PromoCodeDao For database operations
 */
@Entity(tableName = "promo_codes")
data class PromoCodeEntity(
    @PrimaryKey
    val code: String,
    val discountType: String, // "percentage" or "fixed"
    val discountValue: Double,
    val minOrderValue: Double = 0.0,
    val maxDiscount: Double? = null,
    val expiresAt: Long,
    val usageLimit: Int = 1,
    val usedCount: Int = 0,
    val description: String = ""
)
