package com.tgdd.app.data.repository

import com.tgdd.app.data.local.dao.SearchHistoryDao
import com.tgdd.app.data.local.entity.SearchHistoryEntity
import kotlinx.coroutines.flow.Flow
import java.util.concurrent.TimeUnit
import javax.inject.Inject

class SearchHistoryRepository @Inject constructor(
    private val searchHistoryDao: SearchHistoryDao
) {
    fun getRecentSearches(limit: Int = 10): Flow<List<String>> =
        searchHistoryDao.getRecentSearches(limit)

    suspend fun getSuggestions(query: String, limit: Int = 5): List<String> =
        searchHistoryDao.getSuggestions(query, limit)

    suspend fun saveSearch(query: String) {
        if (query.isBlank()) return
        searchHistoryDao.insertSearch(SearchHistoryEntity(query = query.trim()))
    }

    suspend fun deleteSearch(query: String) {
        searchHistoryDao.deleteSearch(query)
    }

    suspend fun clearHistory() {
        searchHistoryDao.clearHistory()
    }

    suspend fun deleteOldSearches(daysOld: Int = 30) {
        val timestamp = System.currentTimeMillis() - TimeUnit.DAYS.toMillis(daysOld.toLong())
        searchHistoryDao.deleteOldSearches(timestamp)
    }
}
