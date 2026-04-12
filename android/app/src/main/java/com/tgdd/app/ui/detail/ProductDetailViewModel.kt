package com.tgdd.app.ui.detail

import androidx.lifecycle.*
import com.tgdd.app.data.local.UserSession
import com.tgdd.app.data.local.entity.CartItemEntity
import com.tgdd.app.data.local.entity.ProductEntity
import com.tgdd.app.data.local.entity.ReviewEntity
import com.tgdd.app.data.model.ProductDto
import com.tgdd.app.data.repository.CartRepository
import com.tgdd.app.data.repository.ProductRepository
import com.tgdd.app.data.repository.ReviewRepository
import com.tgdd.app.data.repository.WishlistRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ProductDetailViewModel @Inject constructor(
    private val productRepository: ProductRepository,
    private val cartRepository: CartRepository,
    private val wishlistRepository: WishlistRepository,
    private val reviewRepository: ReviewRepository,
    private val userSession: UserSession
) : ViewModel() {

    private val _product = MutableLiveData<ProductEntity?>()
    val product: LiveData<ProductEntity?> = _product

    private val _productDto = MutableLiveData<ProductDto?>()
    val productDto: LiveData<ProductDto?> = _productDto

    private val _isInWishlist = MutableLiveData<Boolean>(false)
    val isInWishlist: LiveData<Boolean> = _isInWishlist

    private val _reviews = MutableLiveData<List<ReviewEntity>>(emptyList())
    val reviews: LiveData<List<ReviewEntity>> = _reviews

    private val _averageRating = MutableLiveData<Double>(0.0)
    val averageRating: LiveData<Double> = _averageRating

    private val _reviewCount = MutableLiveData<Int>(0)
    val reviewCount: LiveData<Int> = _reviewCount

    private val _relatedProducts = MutableLiveData<List<ProductEntity>>(emptyList())
    val relatedProducts: LiveData<List<ProductEntity>> = _relatedProducts

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    private val _addedToCart = MutableLiveData<Boolean>()
    val addedToCart: LiveData<Boolean> = _addedToCart

    private val _addedToCartMessage = MutableLiveData<String?>()
    val addedToCartMessage: LiveData<String?> = _addedToCartMessage

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
                    loadRelatedProducts(entity.category)
                }.onFailure { e ->
                    _error.value = e.message ?: "Failed to load product"
                }
                
                var hasReviewsFromDto = false
                
                // Get product DTO which includes reviews from the products.reviews column
                productRepository.getProductDtoById(productId)?.let { dto ->
                    _productDto.value = dto
                    
                    // Use reviews from the DTO if available
                    if (!dto.reviews.isNullOrEmpty()) {
                        // Convert ReviewDto to ReviewEntity for display
                        val reviewEntities = dto.reviews.map { reviewDto ->
                            com.tgdd.app.data.local.entity.ReviewEntity(
                                id = reviewDto.id ?: "",
                                productId = dto.id,
                                userId = reviewDto.userId ?: "",
                                userName = reviewDto.userName ?: "Anonymous",
                                rating = reviewDto.rating,
                                comment = reviewDto.comment ?: "",
                                images = "",
                                helpfulCount = reviewDto.helpfulCount,
                                createdAt = System.currentTimeMillis(),
                                isVerifiedPurchase = reviewDto.isVerifiedPurchase
                            )
                        }
                        _reviews.value = reviewEntities
                        _reviewCount.value = reviewEntities.size
                        _averageRating.value = dto.rating.toDouble()
                        hasReviewsFromDto = true
                    } else {
                        _reviewCount.value = dto.reviewCount
                        _averageRating.value = dto.rating.toDouble()
                    }
                }

                val inWishlist = wishlistRepository.isInWishlist(productId).first()
                _isInWishlist.value = inWishlist

                // Only load from reviews table if we don't have reviews from DTO
                if (!hasReviewsFromDto) {
                    loadReviews(productId)
                }
                
                _isLoading.value = false
            } catch (e: Exception) {
                _error.value = e.message ?: "Failed to load product"
                _isLoading.value = false
            }
        }
    }

    private fun loadReviews(productId: String) {
        viewModelScope.launch {
            try {
                reviewRepository.syncReviews(productId)
                reviewRepository.getReviewsByProductId(productId).collect { reviewList ->
                    _reviews.value = reviewList
                    _reviewCount.value = reviewList.size
                    _averageRating.value = if (reviewList.isNotEmpty()) {
                        reviewList.map { it.rating }.average()
                    } else {
                        0.0
                    }
                }
            } catch (_: Exception) {}
        }
    }

    private fun loadRelatedProducts(category: String) {
        viewModelScope.launch {
            try {
                productRepository.getProductsByCategory(category).onSuccess { products ->
                    _relatedProducts.value = products.take(6)
                }
            } catch (_: Exception) {}
        }
    }

    fun toggleWishlist() {
        val currentProduct = _product.value ?: return
        if (!userSession.isLoggedIn()) {
            _requireLogin.value = true
            return
        }
        viewModelScope.launch {
            val added = wishlistRepository.toggleWishlist(currentProduct)
            _isInWishlist.value = added
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
                _addedToCartMessage.value = "Đã thêm ${product.name} vào giỏ hàng"
            } catch (e: Exception) {
                _error.value = e.message ?: "Failed to add to cart"
            }
        }
    }

    fun resetAddedToCart() { _addedToCart.value = false }
    fun clearAddedToCartMessage() { _addedToCartMessage.value = null }
    fun resetRequireLogin() { _requireLogin.value = false }
    fun clearError() { _error.value = null }
}
