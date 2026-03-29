package com.tgdd.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

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
