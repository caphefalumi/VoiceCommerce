package com.tgdd.app.ui.wishlist

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tgdd.app.data.local.entity.ProductEntity
import com.tgdd.app.data.local.entity.WishlistEntity
import com.tgdd.app.data.repository.CartRepository
import com.tgdd.app.data.repository.WishlistRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class WishlistViewModel @Inject constructor(
    private val wishlistRepository: WishlistRepository,
    private val cartRepository: CartRepository
) : ViewModel() {

    private val _wishlistItems = MutableStateFlow<List<WishlistEntity>>(emptyList())
    val wishlistItems: StateFlow<List<WishlistEntity>> = _wishlistItems.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _message = MutableStateFlow<String?>(null)
    val message: StateFlow<String?> = _message.asStateFlow()

    init {
        loadWishlist()
    }

    private fun loadWishlist() {
        viewModelScope.launch {
            wishlistRepository.getAllWishlistItems().collect { items ->
                _wishlistItems.value = items
            }
        }
    }

    fun removeFromWishlist(productId: String) {
        viewModelScope.launch {
            wishlistRepository.removeFromWishlist(productId)
            _message.value = "Đã xóa khỏi danh sách yêu thích"
        }
    }

    fun moveToCart(item: WishlistEntity) {
        viewModelScope.launch {
            try {
                val product = ProductEntity(
                    id = item.productId,
                    name = item.name,
                    price = item.price,
                    originalPrice = item.originalPrice,
                    image = item.image,
                    category = "",
                    description = "",
                    rating = item.rating,
                    reviewCount = 0,
                    brand = null,
                    inStock = true
                )
                cartRepository.addToCart(product)
                wishlistRepository.removeFromWishlist(item.productId)
                _message.value = "Đã thêm vào giỏ hàng"
            } catch (e: Exception) {
                _message.value = "Lỗi: ${e.message}"
            }
        }
    }

    fun clearMessage() {
        _message.value = null
    }

    fun syncWishlist() {
        viewModelScope.launch {
            _isLoading.value = true
            wishlistRepository.syncWishlist()
            _isLoading.value = false
        }
    }
}
