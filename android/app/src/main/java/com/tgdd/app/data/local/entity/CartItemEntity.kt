package com.tgdd.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

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
