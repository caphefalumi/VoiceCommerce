package com.tgdd.app.ui.orders

import androidx.lifecycle.*
import com.tgdd.app.data.local.UserSession
import com.tgdd.app.data.local.entity.OrderEntity
import com.tgdd.app.data.repository.OrderRepository
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class OrderDetailViewModel @Inject constructor(
    private val orderRepository: OrderRepository,
    private val userSession: UserSession,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val orderId: String = savedStateHandle.get<String>("orderId") ?: ""

    private val _order = MutableLiveData<OrderEntity?>()
    val order: LiveData<OrderEntity?> = _order

    private val _orderItems = MutableLiveData<List<OrderItemUi>>()
    val orderItems: LiveData<List<OrderItemUi>> = _orderItems

    private val _isLoading = MutableLiveData(true)
    val isLoading: LiveData<Boolean> = _isLoading

    private val gson = Gson()

    init {
        loadOrder()
    }

    private fun loadOrder() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val orderEntity = orderRepository.getOrderById(orderId)
                _order.value = orderEntity

                orderEntity?.let { order ->
                    parseOrderItems(order.items)
                }
            } catch (e: Exception) {
                _order.value = null
            } finally {
                _isLoading.value = false
            }
        }
    }

    private fun parseOrderItems(itemsJson: String) {
        try {
            val type = object : TypeToken<List<OrderItemEntity>>() {}.type
            val items: List<OrderItemEntity> = gson.fromJson(itemsJson, type)
            _orderItems.value = items.map { item ->
                OrderItemUi(
                    name = item.name,
                    price = item.price,
                    quantity = item.quantity,
                    image = item.image
                )
            }
        } catch (e: Exception) {
            _orderItems.value = emptyList()
        }
    }

    fun cancelOrder() {
        viewModelScope.launch {
            try {
                _order.value?.let { order ->
                    orderRepository.cancelOrder(order)
                    _order.value = order.copy(status = "cancelled")
                }
            } catch (_: Exception) {}
        }
    }
}

data class OrderItemUi(
    val name: String,
    val price: Double,
    val quantity: Int,
    val image: String
)

data class OrderItemEntity(
    val id: Long = 0,
    val productId: String = "",
    val name: String = "",
    val image: String = "",
    val price: Double = 0.0,
    val quantity: Int = 1
)