package com.tgdd.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

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
