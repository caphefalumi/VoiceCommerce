package com.tgdd.app.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "products")
data class Product(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val name: String,
    val description: String,
    val price: Double,
    val imageUrl: String?,
    val category: String,
    val stock: Int = 0,
    val rating: Float = 0f,
    val createdAt: Long = System.currentTimeMillis()
)
