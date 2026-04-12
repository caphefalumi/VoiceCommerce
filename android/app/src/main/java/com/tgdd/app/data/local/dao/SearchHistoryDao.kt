package com.tgdd.app.data.local.dao

import androidx.room.*
import com.tgdd.app.data.local.entity.SearchHistoryEntity
import kotlinx.coroutines.flow.Flow

/**
 * Data Access Object for search history database operations.
 *
 * Operations:
 * - getRecentSearches(): Fetch recent search queries (distinct, limited)
 * - getSuggestions(): Get search suggestions based on prefix
 * - insertSearch(): Record new search query
 * - deleteSearch(): Remove specific search from history
 * - clearHistory(): Clear all search history
 * - deleteOldSearches(): Cleanup searches older than timestamp
 *
 * Transactions:
 * - All write operations are transaction-safe
 *
 * @see com.tgdd.app.data.local.entity.SearchHistoryEntity For entity definition
 */
@Dao
interface SearchHistoryDao {
    @Query("SELECT DISTINCT query FROM search_history ORDER BY timestamp DESC LIMIT :limit")
    fun getRecentSearches(limit: Int = 10): Flow<List<String>>

    @Query("SELECT DISTINCT query FROM search_history WHERE query LIKE :query || '%' ORDER BY timestamp DESC LIMIT :limit")
    suspend fun getSuggestions(query: String, limit: Int = 5): List<String>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSearch(search: SearchHistoryEntity)

    @Query("DELETE FROM search_history WHERE query = :query")
    suspend fun deleteSearch(query: String)

    @Query("DELETE FROM search_history")
    suspend fun clearHistory()

    @Query("DELETE FROM search_history WHERE timestamp < :timestamp")
    suspend fun deleteOldSearches(timestamp: Long)
}
