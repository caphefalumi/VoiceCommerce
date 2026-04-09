package com.tgdd.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "addresses")
data class AddressEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val userId: String,
    val name: String,
    val phone: String,
    val street: String,
    val city: String,
    val district: String = "",
    val ward: String = "",
    val isDefault: Boolean = false,
    val label: String = "Home" // Home, Work, Other
)
