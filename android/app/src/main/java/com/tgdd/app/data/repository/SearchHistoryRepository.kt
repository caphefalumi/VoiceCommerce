package com.tgdd.app.data.repository

import com.tgdd.app.data.local.dao.SearchHistoryDao
import com.tgdd.app.data.local.entity.SearchHistoryEntity
import kotlinx.coroutines.flow.Flow
import java.util.concurrent.TimeUnit
import javax.inject.Inject

/**
 * Repository for search history management.
 * 
 * Data Source Strategy: Local-only (Room)
 * 
 * ## Read Flow:
 * 1. All data stored locally in Room
 * 2. No server sync
 * 3. Search history is device-specific
 * 
 * ## Write Flow:
 * 1. Save searches locally
 * 2. Automatic cleanup of old entries
 * 
 * ## Caching Mechanism:
 * - [SearchHistoryDao] (Room) as sole data source
 * - No network sync
 * - Automatic expiration of old searches
 * 
 * @see SearchHistoryDao For local search history storage
 */
class SearchHistoryRepository @Inject constructor(
    private val searchHistoryDao: SearchHistoryDao
) {
    /**
     * Gets recent search queries.
     * 
     * @param limit Maximum number of searches to return (default 10)
     * @return Flow emitting recent search strings
     */
    fun getRecentSearches(limit: Int = 10): Flow<List<String>> =
        searchHistoryDao.getRecentSearches(limit)

    /**
     * Gets search suggestions based on query prefix.
     * 
     * @param query Query string to match
     * @param limit Maximum suggestions to return (default 5)
     * @return List of matching search suggestions
     */
    suspend fun getSuggestions(query: String, limit: Int = 5): List<String> =
        searchHistoryDao.getSuggestions(query, limit)

    /**
     * Saves a search query to history.
     * 
     * Duplicate queries update the timestamp rather than creating new entries.
     * 
     * @param query Search query to save
     */
    suspend fun saveSearch(query: String) {
        if (query.isBlank()) return
        searchHistoryDao.insertSearch(SearchHistoryEntity(query = query.trim()))
    }

    /**
     * Deletes a specific search from history.
     * 
     * @param query Search query to delete
     */
    suspend fun deleteSearch(query: String) {
        searchHistoryDao.deleteSearch(query)
    }

    /**
     * Clears all search history.
     */
    suspend fun clearHistory() {
        searchHistoryDao.clearHistory()
    }

    /**
     * Deletes searches older than specified days.
     * 
     * Cleanup utility to prevent unlimited growth of search history.
     * 
     * @param daysOld Delete searches older than this many days (default 30)
     */
    suspend fun deleteOldSearches(daysOld: Int = 30) {
        // Calculate timestamp threshold
        val timestamp = System.currentTimeMillis() - TimeUnit.DAYS.toMillis(daysOld.toLong())
        searchHistoryDao.deleteOldSearches(timestamp)
    }
}
