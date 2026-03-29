package com.tgdd.app.ui.checkout

import androidx.lifecycle.*
import com.tgdd.app.data.local.UserSession
import com.tgdd.app.data.local.entity.CartItemEntity
import com.tgdd.app.data.repository.CartRepository
import com.tgdd.app.data.repository.OrderRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class CheckoutViewModel @Inject constructor(
    private val cartRepository: CartRepository,
    private val orderRepository: OrderRepository,
    private val userSession: UserSession
) : ViewModel() {

    val cartItems: LiveData<List<CartItemEntity>> = cartRepository.getAllCartItems().asLiveData()
    val cartTotal: LiveData<Double> = cartRepository.getCartTotal().asLiveData()

    val name = MutableLiveData<String>("")
    val address = MutableLiveData<String>("")
    val phone = MutableLiveData<String>("")
    val city = MutableLiveData<String>("")
    val paymentMethod = MutableLiveData<String>("cod")

    private val _nameError = MutableLiveData<String?>()
    val nameError: LiveData<String?> = _nameError

    private val _addressError = MutableLiveData<String?>()
    val addressError: LiveData<String?> = _addressError

    private val _phoneError = MutableLiveData<String?>()
    val phoneError: LiveData<String?> = _phoneError

    private val _cityError = MutableLiveData<String?>()
    val cityError: LiveData<String?> = _cityError

    private val _orderPlaced = MutableLiveData<Boolean>()
    val orderPlaced: LiveData<Boolean> = _orderPlaced

    private val _orderId = MutableLiveData<String?>()
    val orderId: LiveData<String?> = _orderId

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    fun validate(): Boolean {
        var isValid = true

        if (name.value.isNullOrBlank()) {
            _nameError.value = "Name is required"
            isValid = false
        } else {
            _nameError.value = null
        }

        if (address.value.isNullOrBlank()) {
            _addressError.value = "Address is required"
            isValid = false
        } else {
            _addressError.value = null
        }

        if (phone.value.isNullOrBlank()) {
            _phoneError.value = "Phone is required"
            isValid = false
        } else if (!isValidPhone(phone.value!!)) {
            _phoneError.value = "Invalid phone number"
            isValid = false
        } else {
            _phoneError.value = null
        }

        if (city.value.isNullOrBlank()) {
            _cityError.value = "Vui lòng nhập Tỉnh/Thành phố"
            isValid = false
        } else {
            _cityError.value = null
        }

        return isValid
    }

    private fun isValidPhone(phone: String): Boolean {
        return phone.matches(Regex("^[0-9+\\-\\s]{10,15}$"))
    }

    fun placeOrder(items: List<CartItemEntity>, total: Double) {
        if (!validate()) return
        if (items.isEmpty()) {
            _error.value = "Giỏ hàng trống"
            return
        }

        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                val orderId = orderRepository.createOrder(
                    customerName = name.value ?: "",
                    customerPhone = phone.value ?: "",
                    address = "${address.value ?: ""}, ${city.value ?: ""}".trim().trimEnd(','),
                    paymentMethod = paymentMethod.value ?: "cod",
                    userId = userSession.getUserId() ?: ""
                )
                _orderId.value = orderId
                _orderPlaced.value = true
                _isLoading.value = false
            } catch (e: Exception) {
                _error.value = e.message ?: "Failed to place order"
                _isLoading.value = false
            }
        }
    }

    fun resetOrderPlaced() {
        _orderPlaced.value = false
        _orderId.value = null
    }

    fun clearError() {
        _error.value = null
    }
}
