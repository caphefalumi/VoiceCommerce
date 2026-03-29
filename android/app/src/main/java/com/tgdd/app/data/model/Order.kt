package com.tgdd.app.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "orders")
data class Order(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val userId: Long,
    val totalAmount: Double,
    val status: String = "pending",
    val shippingAddress: String,
    val phoneNumber: String,
    val notes: String?,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)
