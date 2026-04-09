package com.tgdd.app.ui.checkout

import androidx.lifecycle.*
import com.tgdd.app.data.local.UserSession
import com.tgdd.app.data.local.entity.AddressEntity
import com.tgdd.app.data.local.entity.CartItemEntity
import com.tgdd.app.data.local.entity.ProductEntity
import com.tgdd.app.data.repository.AddressRepository
import com.tgdd.app.data.repository.CartRepository
import com.tgdd.app.data.repository.OrderRepository
import com.tgdd.app.data.repository.ProductRepository
import com.tgdd.app.data.repository.PromoCodeRepository
import com.tgdd.app.utils.StockValidator
import com.tgdd.app.utils.ValidationUtils
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class CheckoutViewModel @Inject constructor(
    private val cartRepository: CartRepository,
    private val orderRepository: OrderRepository,
    private val addressRepository: AddressRepository,
    private val promoCodeRepository: PromoCodeRepository,
    private val productRepository: ProductRepository,
    private val userSession: UserSession
) : ViewModel() {

    val cartItems: LiveData<List<CartItemEntity>> = cartRepository.getAllCartItems().asLiveData()
    val cartTotal: LiveData<Double> = cartRepository.getCartTotal().asLiveData()

    val name = MutableLiveData<String>("")
    val address = MutableLiveData<String>("")
    val phone = MutableLiveData<String>("")
    val city = MutableLiveData<String>("")
    val paymentMethod = MutableLiveData<String>("cod")

    private val _savedAddresses = MutableLiveData<List<AddressEntity>>()
    val savedAddresses: LiveData<List<AddressEntity>> = _savedAddresses

    private val _selectedAddress = MutableLiveData<AddressEntity?>()
    val selectedAddress: LiveData<AddressEntity?> = _selectedAddress

    private val _promoCode = MutableLiveData<String?>()
    val promoCode: LiveData<String?> = _promoCode

    private val _discountAmount = MutableLiveData<Double>(0.0)
    val discountAmount: LiveData<Double> = _discountAmount

    private val _finalTotal = MutableLiveData<Double>()
    val finalTotal: LiveData<Double> = _finalTotal

    private val _stockValidation = MutableLiveData<StockValidator.StockValidationResult?>()
    val stockValidation: LiveData<StockValidator.StockValidationResult?> = _stockValidation

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

    private val _checkoutUrl = MutableLiveData<String?>()
    val checkoutUrl: LiveData<String?> = _checkoutUrl

    init {
        loadSavedAddresses()
        observeCartTotal()
    }

    private fun loadSavedAddresses() {
        viewModelScope.launch {
            val userId = userSession.getUserId() ?: return@launch
            addressRepository.getAddressesByUserId(userId).collect { addresses ->
                _savedAddresses.value = addresses
                if (_selectedAddress.value == null) {
                    val defaultAddress = addresses.firstOrNull { it.isDefault }
                    defaultAddress?.let { selectAddress(it) }
                }
            }
        }
    }

    private fun observeCartTotal() {
        cartTotal.observeForever { total ->
            calculateFinalTotal(total)
        }
    }

    fun selectAddress(address: AddressEntity) {
        _selectedAddress.value = address
        name.value = address.name
        phone.value = address.phone
        this.address.value = address.street
        city.value = address.city
    }

    fun applyPromoCode(code: String) {
        val total = cartTotal.value ?: 0.0
        if (total <= 0) {
            _error.value = "Giỏ hàng trống"
            return
        }

        viewModelScope.launch {
            val result = promoCodeRepository.validatePromoCode(code, total)
            if (result.isSuccess) {
                val discount = result.getOrThrow()
                _promoCode.value = code
                _discountAmount.value = discount
                calculateFinalTotal(total)
            } else {
                _error.value = result.exceptionOrNull()?.message
            }
        }
    }

    fun removePromoCode() {
        _promoCode.value = null
        _discountAmount.value = 0.0
        calculateFinalTotal(cartTotal.value ?: 0.0)
    }

    private fun calculateFinalTotal(subtotal: Double) {
        val discount = _discountAmount.value ?: 0.0
        _finalTotal.value = (subtotal - discount).coerceAtLeast(0.0)
    }

    suspend fun validateStock(): Boolean {
        val items = cartItems.value ?: emptyList()
        if (items.isEmpty()) return false

        val productMap = mutableMapOf<String, ProductEntity>()
        items.forEach { cartItem ->
            val result = productRepository.getProductById(cartItem.productId)
            if (result.isSuccess) {
                productMap[cartItem.productId] = result.getOrThrow()
            }
        }

        val validation = StockValidator.validateCartStock(items, productMap)
        _stockValidation.value = validation
        return validation.isValid
    }

    fun validate(): Boolean {
        val validationResult = ValidationUtils.validateCheckoutData(
            name.value ?: "",
            phone.value ?: "",
            "${address.value ?: ""}, ${city.value ?: ""}"
        )

        return when (validationResult) {
            is ValidationUtils.ValidationResult.Success -> {
                _nameError.value = null
                _addressError.value = null
                _phoneError.value = null
                _cityError.value = null
                true
            }
            is ValidationUtils.ValidationResult.Error -> {
                _error.value = validationResult.message
                false
            }
        }
    }

    fun placeOrder(items: List<CartItemEntity>, total: Double) {
        if (paymentMethod.value == "stripe") {
            startStripeCheckout(items)
            return
        }
        if (!validate()) return
        if (items.isEmpty()) {
            _error.value = "Giỏ hàng trống"
            return
        }

        viewModelScope.launch {
            // Validate stock before placing order
            if (!validateStock()) {
                val validation = _stockValidation.value
                if (validation != null && validation.outOfStockItems.isNotEmpty()) {
                    _error.value = "Sản phẩm hết hàng: ${validation.outOfStockItems.joinToString(", ")}"
                    return@launch
                }
            }

            _isLoading.value = true
            _error.value = null
            try {
                // Apply promo code if exists
                _promoCode.value?.let { code ->
                    promoCodeRepository.applyPromoCode(code, total)
                }

                val fullAddress = "${address.value ?: ""}, ${city.value ?: ""}"
                val orderId = orderRepository.createOrder(
                    customerName = name.value ?: "",
                    customerPhone = phone.value ?: "",
                    address = fullAddress,
                    paymentMethod = paymentMethod.value ?: "cod",
                    userId = userSession.getUserId() ?: "",
                    userEmail = userSession.getUserEmail() ?: ""
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

    private fun startStripeCheckout(items: List<CartItemEntity>) {
        if (!validate()) return
        if (items.isEmpty()) {
            _error.value = "Giỏ hàng trống"
            return
        }

        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                val fullAddress = "${address.value ?: ""}, ${city.value ?: ""}"
                val url = orderRepository.createStripeCheckoutSession(
                    customerName = name.value ?: "",
                    customerPhone = phone.value ?: "",
                    address = fullAddress,
                    userId = userSession.getUserId() ?: "",
                    userEmail = userSession.getUserEmail() ?: ""
                )
                _checkoutUrl.value = url
                _isLoading.value = false
            } catch (e: Exception) {
                _error.value = e.message ?: "Failed to start checkout"
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
