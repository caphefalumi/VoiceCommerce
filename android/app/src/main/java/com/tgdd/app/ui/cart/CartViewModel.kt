package com.tgdd.app.ui.cart

import androidx.lifecycle.LiveData
import androidx.lifecycle.MediatorLiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.asLiveData
import androidx.lifecycle.viewModelScope
import com.tgdd.app.data.local.entity.CartItemEntity
import com.tgdd.app.data.repository.CartRepository
import com.tgdd.app.data.repository.PromoCodeRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class CartViewModel @Inject constructor(
    private val cartRepository: CartRepository,
    private val promoCodeRepository: PromoCodeRepository,
    private val userSession: com.tgdd.app.data.local.UserSession
) : ViewModel() {

    val cartItems: LiveData<List<CartItemEntity>> = cartRepository.getAllCartItems().asLiveData()

    val cartTotal: LiveData<Double> = cartRepository.getCartTotal().asLiveData()

    val cartItemCount: LiveData<Int> = cartRepository.getCartItemCount().asLiveData()

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    private val _isRefreshing = MutableLiveData(false)
    val isRefreshing: LiveData<Boolean> = _isRefreshing

    private val _appliedCouponCode = MutableLiveData<String?>(null)
    val appliedCouponCode: LiveData<String?> = _appliedCouponCode

    private val _discountAmount = MutableLiveData(0.0)
    val discountAmount: LiveData<Double> = _discountAmount

    private val _finalTotal = MediatorLiveData<Double>().apply {
        value = 0.0
        addSource(cartTotal) { subtotal ->
            val discount = _discountAmount.value ?: 0.0
            value = (subtotal - discount).coerceAtLeast(0.0)
        }
        addSource(_discountAmount) { discount ->
            val subtotal = cartTotal.value ?: 0.0
            value = (subtotal - (discount ?: 0.0)).coerceAtLeast(0.0)
        }
    }
    val finalTotal: LiveData<Double> = _finalTotal

    fun refreshCart() {
        _isRefreshing.value = true
        viewModelScope.launch {
            try {
                cartRepository.syncCart()
            } catch (e: Exception) {
                _error.value = e.message
            } finally {
                _isRefreshing.value = false
            }
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
                cartRepository.removeFromCart(itemId)
            } catch (e: Exception) {
                _error.value = e.message
            }
        }
    }

    fun clearCart() {
        viewModelScope.launch {
            try {
                cartRepository.clearCart()
                _appliedCouponCode.value = null
                _discountAmount.value = 0.0
                _finalTotal.value = 0.0
            } catch (e: Exception) {
                _error.value = e.message
            }
        }
    }

    fun applyCoupon(code: String) {
        val subtotal = cartTotal.value ?: 0.0
        if (subtotal <= 0.0) {
            _error.value = "Giỏ hàng trống"
            return
        }

        viewModelScope.launch {
            val result = promoCodeRepository.applyCoupon(
                code = code.trim(),
                orderTotal = subtotal,
                userId = userSession.getUserId()
            )

            if (result.isSuccess) {
                val coupon = result.getOrThrow()
                _appliedCouponCode.value = coupon.couponCode
                _discountAmount.value = coupon.discountAmount
                _error.value = coupon.message
            } else {
                _error.value = result.exceptionOrNull()?.message ?: "Không thể áp dụng mã giảm giá"
            }
        }
    }

    fun clearCoupon() {
        _appliedCouponCode.value = null
        _discountAmount.value = 0.0
        _finalTotal.value = cartTotal.value ?: 0.0
    }

    fun clearError() {
        _error.value = null
    }
}
