package com.tgdd.app.ui.detail

import androidx.lifecycle.*
import com.tgdd.app.data.local.UserSession
import com.tgdd.app.data.local.entity.CartItemEntity
import com.tgdd.app.data.local.entity.ProductEntity
import com.tgdd.app.data.model.ProductDto
import com.tgdd.app.data.model.ReviewDto
import com.tgdd.app.data.repository.CartRepository
import com.tgdd.app.data.repository.ProductRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ProductDetailViewModel @Inject constructor(
    private val productRepository: ProductRepository,
    private val cartRepository: CartRepository,
    private val userSession: UserSession
) : ViewModel() {

    private val _product = MutableLiveData<ProductEntity?>()
    val product: LiveData<ProductEntity?> = _product

    private val _productDto = MutableLiveData<ProductDto?>()
    val productDto: LiveData<ProductDto?> = _productDto

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    private val _addedToCart = MutableLiveData<Boolean>()
    val addedToCart: LiveData<Boolean> = _addedToCart

    private val _requireLogin = MutableLiveData<Boolean>()
    val requireLogin: LiveData<Boolean> = _requireLogin

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    fun loadProduct(productId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                productRepository.getProductById(productId).onSuccess { entity ->
                    _product.value = entity
                }.onFailure { e ->
                    _error.value = e.message ?: "Failed to load product"
                }
                // Also fetch full DTO for specs/reviews
                productRepository.getProductDtoById(productId)?.let { dto ->
                    _productDto.value = dto
                }
                _isLoading.value = false
            } catch (e: Exception) {
                _error.value = e.message ?: "Failed to load product"
                _isLoading.value = false
            }
        }
    }

    fun addToCart(product: ProductEntity, quantity: Int = 1) {
        if (!userSession.isLoggedIn()) {
            _requireLogin.value = true
            return
        }
        viewModelScope.launch {
            try {
                val cartItem = CartItemEntity(
                    productId = product.id,
                    name = product.name,
                    image = product.image,
                    price = product.price,
                    quantity = quantity
                )
                cartRepository.addToCart(cartItem)
                _addedToCart.value = true
            } catch (e: Exception) {
                _error.value = e.message ?: "Failed to add to cart"
            }
        }
    }

    fun resetAddedToCart() { _addedToCart.value = false }
    fun resetRequireLogin() { _requireLogin.value = false }
    fun clearError() { _error.value = null }
}
