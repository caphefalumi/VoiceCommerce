package com.tgdd.app.ui.orders

import androidx.lifecycle.*
import com.tgdd.app.data.local.UserSession
import com.tgdd.app.data.local.entity.OrderEntity
import com.tgdd.app.data.repository.OrderRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel for orders list screen.
 *
 * Responsibilities:
 * - Load user's order history from server
 * - Sync local cache with server data
 * - Display orders in chronological order
 *
 * UI State:
 * - orders: List<OrderEntity> - User's orders
 * - isLoading: Boolean - Loading indicator
 * - error: String? - Error message
 *
 * Data Flow:
 * 1. Check user session for valid userId
 * 2. Sync orders from server via OrderRepository
 * 3. Collect and expose via LiveData
 *
 * @see OrdersFragment For UI binding
 * @see OrderRepository For data operations
 */
@HiltViewModel
class OrdersViewModel @Inject constructor(
    private val orderRepository: OrderRepository,
    private val userSession: UserSession
) : ViewModel() {

    private val _orders = MutableLiveData<List<OrderEntity>>()
    val orders: LiveData<List<OrderEntity>> = _orders

    private val _isLoading = MutableLiveData(true)
    val isLoading: LiveData<Boolean> = _isLoading

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    init {
        loadOrders()
    }

    fun refreshOrders() {
        loadOrders()
    }

    /**
     * Loads orders from server and caches locally.
     *
     * Flow:
     * 1. Validate user session
     * 2. Sync orders from server (pull-to-refresh support)
     * 3. Collect and expose via LiveData
     */
    private fun loadOrders() {
        val userId = userSession.getUserId()
        if (userId.isNullOrBlank()) {
            _isLoading.value = false
            _orders.value = emptyList()
            return
        }
        viewModelScope.launch {
            _isLoading.value = true
            try {
                // Sync: fetch from server and update local cache
                orderRepository.syncOrders(userId)
                // Collect: Flow emission updates _orders LiveData
                orderRepository.getOrdersByUserId(userId).collect { list ->
                    _orders.value = list
                    _isLoading.value = false
                }
            } catch (e: Exception) {
                _error.value = e.message ?: "Failed to load orders"
                _isLoading.value = false
            }
        }
    }
}
