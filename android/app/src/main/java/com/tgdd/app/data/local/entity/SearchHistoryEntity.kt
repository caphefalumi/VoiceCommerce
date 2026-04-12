package com.tgdd.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity for search history tracking.
 *
 * Table: search_history
 *
 * Sync Strategy:
 * - Local-only storage
 * - Used for search suggestions and recent searches
 * - Can be cleared by user
 *
 * Indexes:
 * - PRIMARY KEY: id (auto-generated)
 * - INDEX: timestamp (for sorting and cleanup)
 *
 * @see com.tgdd.app.data.local.dao.SearchHistoryDao For database operations
 */
@Entity(tableName = "search_history")
data class SearchHistoryEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val query: String,
    val timestamp: Long = System.currentTimeMillis()
)
