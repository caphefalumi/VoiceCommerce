package com.tgdd.app.ui.orders

import androidx.lifecycle.*
import com.tgdd.app.data.local.UserSession
import com.tgdd.app.data.local.entity.OrderEntity
import com.tgdd.app.data.repository.OrderRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

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
                orderRepository.syncOrders(userId)
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
