package com.tgdd.app.ui.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tgdd.app.data.local.entity.ProductEntity
import com.tgdd.app.data.repository.ProductRepository
import com.tgdd.app.data.repository.SearchHistoryRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SearchViewModel @Inject constructor(
    private val productRepository: ProductRepository,
    private val searchHistoryRepository: SearchHistoryRepository
) : ViewModel() {

    private val _searchResults = MutableStateFlow<List<ProductEntity>>(emptyList())
    val searchResults: StateFlow<List<ProductEntity>> = _searchResults.asStateFlow()

    private val _recentSearches = MutableStateFlow<List<String>>(emptyList())
    val recentSearches: StateFlow<List<String>> = _recentSearches.asStateFlow()

    private val _suggestions = MutableStateFlow<List<String>>(emptyList())
    val suggestions: StateFlow<List<String>> = _suggestions.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    init {
        loadRecentSearches()
    }

    private fun loadRecentSearches() {
        viewModelScope.launch {
            searchHistoryRepository.getRecentSearches().collect { searches ->
                _recentSearches.value = searches
            }
        }
    }

    fun search(query: String) {
        if (query.isBlank()) {
            _searchResults.value = emptyList()
            return
        }

        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null

            searchHistoryRepository.saveSearch(query)

            val result = productRepository.searchProducts(query)
            if (result.isSuccess) {
                _searchResults.value = result.getOrThrow()
            } else {
                _error.value = result.exceptionOrNull()?.message
                _searchResults.value = emptyList()
            }

            _isLoading.value = false
        }
    }

    fun getSuggestions(query: String) {
        if (query.isBlank()) {
            _suggestions.value = emptyList()
            return
        }

        viewModelScope.launch {
            val suggestions = searchHistoryRepository.getSuggestions(query)
            _suggestions.value = suggestions
        }
    }

    fun deleteSearch(query: String) {
        viewModelScope.launch {
            searchHistoryRepository.deleteSearch(query)
        }
    }

    fun clearHistory() {
        viewModelScope.launch {
            searchHistoryRepository.clearHistory()
        }
    }

    fun clearError() {
        _error.value = null
    }
}
