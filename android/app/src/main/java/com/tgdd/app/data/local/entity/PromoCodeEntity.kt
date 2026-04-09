package com.tgdd.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

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
