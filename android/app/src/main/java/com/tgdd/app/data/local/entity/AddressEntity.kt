package com.tgdd.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity for user shipping addresses.
 *
 * Table: addresses
 *
 * Sync Strategy:
 * - Local-only storage for quick access
 * - Synced to server when user modifies addresses
 * - Available offline for checkout flow
 *
 * Indexes:
 * - PRIMARY KEY: id (auto-generated)
 * - INDEX: userId (for user address queries)
 *
 * @see com.tgdd.app.data.local.dao.AddressDao For database operations
 */
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
