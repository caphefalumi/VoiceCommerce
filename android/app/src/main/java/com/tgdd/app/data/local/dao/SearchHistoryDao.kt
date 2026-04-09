package com.tgdd.app.data.local.dao

import androidx.room.*
import com.tgdd.app.data.local.entity.SearchHistoryEntity
import kotlinx.coroutines.flow.Flow

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
