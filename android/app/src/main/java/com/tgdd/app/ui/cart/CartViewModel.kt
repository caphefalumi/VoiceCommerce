package com.tgdd.app.ui.cart

import androidx.lifecycle.*
import com.tgdd.app.data.local.entity.CartItemEntity
import com.tgdd.app.data.repository.CartRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class CartViewModel @Inject constructor(
    private val cartRepository: CartRepository
) : ViewModel() {

    val cartItems: LiveData<List<CartItemEntity>> = cartRepository.getAllCartItems().asLiveData()

    val cartTotal: LiveData<Double> = cartRepository.getCartTotal().asLiveData()

    val cartItemCount: LiveData<Int> = cartRepository.getCartItemCount().asLiveData()

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    private val _isRefreshing = MutableLiveData(false)
    val isRefreshing: LiveData<Boolean> = _isRefreshing

    fun refreshCart() {
        _isRefreshing.value = true
        viewModelScope.launch {
            kotlinx.coroutines.delay(500)
            _isRefreshing.value = false
        }
    }

    fun updateQuantity(itemId: Long, quantity: Int) {
        if (quantity < 1) {
            removeItem(itemId)
            return
        }
        viewModelScope.launch {
            try {
                cartRepository.updateQuantity(itemId, quantity)
            } catch (e: Exception) {
                _error.value = e.message
            }
        }
    }

    fun removeItem(itemId: Long) {
        viewModelScope.launch {
            try {
                cartRepository.removeFromCart(
                    CartItemEntity(
                        id = itemId,
                        productId = "",
                        name = "",
                        image = "",
                        price = 0.0,
                        quantity = 0
                    )
                )
            } catch (e: Exception) {
                _error.value = e.message
            }
        }
    }

    fun clearCart() {
        viewModelScope.launch {
            try {
                cartRepository.clearCart()
            } catch (e: Exception) {
                _error.value = e.message
            }
        }
    }

    fun clearError() {
        _error.value = null
    }
}
