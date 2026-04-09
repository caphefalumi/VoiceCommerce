package com.tgdd.app.ui.review

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tgdd.app.data.local.UserSession
import com.tgdd.app.data.local.entity.ReviewEntity
import com.tgdd.app.data.repository.ReviewRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ReviewViewModel @Inject constructor(
    private val reviewRepository: ReviewRepository,
    private val userSession: UserSession
) : ViewModel() {

    private val _reviews = MutableStateFlow<List<ReviewEntity>>(emptyList())
    val reviews: StateFlow<List<ReviewEntity>> = _reviews.asStateFlow()

    private val _averageRating = MutableStateFlow(0.0)
    val averageRating: StateFlow<Double> = _averageRating.asStateFlow()

    private val _reviewCount = MutableStateFlow(0)
    val reviewCount: StateFlow<Int> = _reviewCount.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _message = MutableStateFlow<String?>(null)
    val message: StateFlow<String?> = _message.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    fun loadReviews(productId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            reviewRepository.getReviewsByProductId(productId).collect { reviewList ->
                _reviews.value = reviewList
                _reviewCount.value = reviewList.size
                _averageRating.value = if (reviewList.isNotEmpty()) {
                    reviewList.map { it.rating }.average()
                } else {
                    0.0
                }
            }
            _isLoading.value = false
        }
    }

    fun submitReview(
        productId: String,
        rating: Int,
        comment: String,
        images: List<String> = emptyList(),
        isVerifiedPurchase: Boolean = false
    ) {
        viewModelScope.launch {
            _isLoading.value = true
            val userId = userSession.getUserId() ?: run {
                _error.value = "Vui lòng đăng nhập để đánh giá"
                _isLoading.value = false
                return@launch
            }
            val userName = userSession.getUserName() ?: "Anonymous"

            if (rating < 1 || rating > 5) {
                _error.value = "Đánh giá phải từ 1 đến 5 sao"
                _isLoading.value = false
                return@launch
            }

            if (comment.isBlank()) {
                _error.value = "Vui lòng nhập nội dung đánh giá"
                _isLoading.value = false
                return@launch
            }

            val result = reviewRepository.createReview(
                productId = productId,
                userId = userId,
                userName = userName,
                rating = rating,
                comment = comment,
                images = images,
                isVerifiedPurchase = isVerifiedPurchase
            )

            if (result.isSuccess) {
                _message.value = "Đã gửi đánh giá thành công"
                syncReviews(productId)
            } else {
                _error.value = result.exceptionOrNull()?.message ?: "Lỗi khi gửi đánh giá"
            }
            _isLoading.value = false
        }
    }

    fun updateReview(reviewId: String, rating: Int, comment: String, images: List<String>) {
        viewModelScope.launch {
            _isLoading.value = true
            reviewRepository.updateReview(reviewId, rating, comment, images)
            _message.value = "Đã cập nhật đánh giá"
            _isLoading.value = false
        }
    }

    fun deleteReview(reviewId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            reviewRepository.deleteReview(reviewId)
            _message.value = "Đã xóa đánh giá"
            _isLoading.value = false
        }
    }

    fun markHelpful(reviewId: String) {
        viewModelScope.launch {
            reviewRepository.markHelpful(reviewId)
        }
    }

    fun syncReviews(productId: String) {
        viewModelScope.launch {
            reviewRepository.syncReviews(productId)
        }
    }

    fun clearMessage() {
        _message.value = null
    }

    fun clearError() {
        _error.value = null
    }
}
