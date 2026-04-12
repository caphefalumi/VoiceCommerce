package com.tgdd.app.ui.checkout

import androidx.lifecycle.*
import com.tgdd.app.data.local.UserSession
import com.tgdd.app.data.local.entity.AddressEntity
import com.tgdd.app.data.model.CartItemDto
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

/**
 * ViewModel for checkout screen.
 *
 * Responsibilities:
 * - Load saved delivery addresses for user
 * - Handle address selection (saved or manual entry)
 * - Apply promo codes and calculate discounts
 * - Validate form inputs (name, phone, address)
 * - Validate stock availability before order
 * - Create order and process payment
 *
 * UI State:
 * - cartItems: List<CartItemDto> - Items to checkout
 * - cartTotal: Double - Subtotal from cart
 * - savedAddresses: List<AddressEntity> - User's saved addresses
 * - selectedAddress: AddressEntity? - Currently selected address
 * - promoCode: String? - Applied promo code
 * - discountAmount: Double - Calculated discount
 * - finalTotal: Double - Total after discount
 * - stockValidation: StockValidationResult? - Stock check result
 * - nameError, addressError, phoneError, cityError: Validation errors
 * - orderPlaced: Boolean - Order success flag
 * - orderId: String? - Created order ID
 * - isLoading: Boolean - Loading indicator
 *
 * Flow:
 * 1. User enters/selects address
 * 2. Apply promo code (optional)
 * 3. Validate inputs + stock
 * 4. Place order → Show confirmation
 *
 * @see CheckoutFragment For UI binding
 * @see OrderRepository For order creation
 */
@HiltViewModel
class CheckoutViewModel @Inject constructor(
    private val cartRepository: CartRepository,
    private val orderRepository: OrderRepository,
    private val addressRepository: AddressRepository,
    private val promoCodeRepository: PromoCodeRepository,
    private val productRepository: ProductRepository,
    private val userSession: UserSession
) : ViewModel() {

    val cartItems: LiveData<List<CartItemDto>> = cartRepository.getAllCartItems().asLiveData()
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

    private val _couponMessage = MutableLiveData<String?>()
    val couponMessage: LiveData<String?> = _couponMessage

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

    init {
        loadSavedAddresses()
        calculateFinalTotal(0.0)
    }

    private fun loadSavedAddresses() {
        viewModelScope.launch {
            try {
                val userId = userSession.getUserId() ?: return@launch
                addressRepository.getAddressesByUserId(userId).collect { addresses ->
                    _savedAddresses.value = addresses
                    if (_selectedAddress.value == null) {
                        val defaultAddress = addresses.firstOrNull { it.isDefault }
                        defaultAddress?.let { selectAddress(it) }
                    }
                }
            } catch (_: Exception) {}
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
            val result = promoCodeRepository.applyCoupon(
                code = code,
                orderTotal = total,
                userId = userSession.getUserId()
            )
            if (result.isSuccess) {
                val couponResult = result.getOrThrow()
                _promoCode.value = couponResult.couponCode
                _discountAmount.value = couponResult.discountAmount
                _finalTotal.value = couponResult.finalTotal
                _couponMessage.value = couponResult.message
            } else {
                _error.value = result.exceptionOrNull()?.message
            }
        }
    }

    fun removePromoCode() {
        _promoCode.value = null
        _discountAmount.value = 0.0
        _couponMessage.value = null
        calculateFinalTotal(cartTotal.value ?: 0.0)
    }

    private fun calculateFinalTotal(subtotal: Double) {
        val discount = _discountAmount.value ?: 0.0
        _finalTotal.value = (subtotal - discount).coerceAtLeast(0.0)
    }

    /**
     * Validates stock availability for all cart items.
     * Called before placing order to prevent overselling.
     *
     * @return true if all items are in stock, false otherwise
     * @see StockValidator For validation logic
     */
    suspend fun validateStock(): Boolean {
        val items = cartItems.value ?: emptyList()
        if (items.isEmpty()) return false

        // Build product map for stock checking
        val productMap = mutableMapOf<String, ProductEntity>()
        items.forEach { cartItem ->
            cartItem.productId?.let { productId ->
                val result = productRepository.getProductById(productId)
                if (result.isSuccess) {
                    productMap[productId] = result.getOrThrow()
                }
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

    fun clearCouponMessage() {
        _couponMessage.value = null
    }

    /**
     * Places order after validation.
     *
     * Order placement flow:
     * 1. Validate form inputs (name, phone, address)
     * 2. Validate stock availability
     * 3. Create order with discounted total
     * 4. Cart is cleared automatically by OrderRepository
     * 5. Set orderPlaced=true on success
     *
     * @param items Cart items to order
     * @param finalTotal Final total after discount
     */
    fun placeOrder(items: List<CartItemDto>, finalTotal: Double) {
        // Step 1: Validate form inputs
        if (!validate()) return
        if (items.isEmpty()) {
            _error.value = "Giỏ hàng trống"
            return
        }

        viewModelScope.launch {
            // Step 2: Stock validation
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
                // Step 3: Create order with discounted total
                val fullAddress = "${address.value ?: ""}, ${city.value ?: ""}"
                val orderId = orderRepository.createOrder(
                    customerName = name.value ?: "",
                    customerPhone = phone.value ?: "",
                    address = fullAddress,
                    paymentMethod = paymentMethod.value ?: "cod",
                    userId = userSession.getUserId() ?: "",
                    userEmail = userSession.getUserEmail() ?: "",
                    discountedTotal = finalTotal
                )
                
                // Step 4: Success - notify UI (cart already cleared by repository)
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
