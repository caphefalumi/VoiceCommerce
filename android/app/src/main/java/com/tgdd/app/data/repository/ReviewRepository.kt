package com.tgdd.app.data.repository

import android.util.Log
import com.tgdd.app.data.local.dao.ReviewDao
import com.tgdd.app.data.local.entity.ReviewEntity
import com.tgdd.app.data.model.ReviewDto
import com.tgdd.app.data.network.NetworkObserver
import com.tgdd.app.data.remote.ReviewApi
import com.google.gson.Gson
import java.text.SimpleDateFormat
import kotlinx.coroutines.flow.Flow
import java.util.Locale
import java.util.TimeZone
import java.util.UUID
import javax.inject.Inject

class ReviewRepository @Inject constructor(
    private val reviewDao: ReviewDao,
    private val reviewApi: ReviewApi
) {
    private val gson = Gson()

    fun getReviewsByProductId(productId: String): Flow<List<ReviewEntity>> =
        reviewDao.getReviewsByProductId(productId)

    fun getReviewsByUserId(userId: String): Flow<List<ReviewEntity>> =
        reviewDao.getReviewsByUserId(userId)

    suspend fun getAverageRating(productId: String): Double =
        reviewDao.getAverageRating(productId) ?: 0.0

    suspend fun getReviewCount(productId: String): Int =
        reviewDao.getReviewCount(productId)

    suspend fun createReview(
        productId: String,
        userId: String,
        userName: String,
        rating: Int,
        comment: String,
        images: List<String> = emptyList(),
        isVerifiedPurchase: Boolean = false
    ): Result<ReviewEntity> {
        val reviewId = UUID.randomUUID().toString()
        val review = ReviewEntity(
            id = reviewId,
            productId = productId,
            userId = userId,
            userName = userName,
            rating = rating,
            comment = comment,
            images = gson.toJson(images),
            isVerifiedPurchase = isVerifiedPurchase
        )
        
        reviewDao.insertReview(review)
        
        if (NetworkObserver.isCurrentlyConnected()) {
            try {
                val response = reviewApi.createReview(
                    productId = productId,
                    mapOf(
                        "user_id" to userId,
                        "rating" to rating,
                        "comment" to comment,
                        "images" to images,
                        "verified_purchase" to isVerifiedPurchase
                    )
                )
                if (response.isSuccessful) {
                    response.body()?.review?.let { dto ->
                        val syncedReview = dto.toEntity()
                        reviewDao.insertReview(syncedReview)
                        return Result.success(syncedReview)
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Create review sync failed: ${e.message}", e)
            }
        }
        
        return Result.success(review)
    }

    suspend fun updateReview(reviewId: String, rating: Int, comment: String, images: List<String>) {
        val existing = reviewDao.getReviewById(reviewId) ?: return
        val updated = existing.copy(
            rating = rating,
            comment = comment,
            images = gson.toJson(images)
        )
        reviewDao.updateReview(updated)
        
        if (NetworkObserver.isCurrentlyConnected()) {
            try {
                reviewApi.updateReview(
                    reviewId,
                    mapOf(
                        "rating" to rating,
                        "comment" to comment,
                        "images" to images
                    )
                )
            } catch (e: Exception) {
                Log.e(TAG, "Update review sync failed: ${e.message}", e)
            }
        }
    }

    suspend fun deleteReview(reviewId: String) {
        val review = reviewDao.getReviewById(reviewId) ?: return
        reviewDao.deleteReview(review)
        
        if (NetworkObserver.isCurrentlyConnected()) {
            try {
                reviewApi.deleteReview(reviewId)
            } catch (e: Exception) {
                Log.e(TAG, "Delete review sync failed: ${e.message}", e)
            }
        }
    }

    suspend fun markHelpful(reviewId: String) {
        val review = reviewDao.getReviewById(reviewId) ?: return
        val updated = review.copy(helpfulCount = review.helpfulCount + 1)
        reviewDao.updateReview(updated)
        
        if (NetworkObserver.isCurrentlyConnected()) {
            try {
                reviewApi.markHelpful(reviewId)
            } catch (e: Exception) {
                Log.e(TAG, "Mark helpful sync failed: ${e.message}", e)
            }
        }
    }

    suspend fun syncReviews(productId: String) {
        if (!NetworkObserver.isCurrentlyConnected()) {
            Log.w(TAG, "Cannot sync reviews: no network connection")
            return
        }
        try {
            val response = reviewApi.getReviewsByProductId(productId)
            if (response.isSuccessful) {
                response.body()?.reviews?.let { reviews ->
                    reviewDao.deleteReviewsByProductId(productId)
                    reviews.forEach { dto ->
                        reviewDao.insertReview(dto.toEntity())
                    }
                    Log.d(TAG, "Synced ${reviews.size} reviews for product $productId")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Sync reviews failed: ${e.message}", e)
        }
    }

    companion object {
        private const val TAG = "ReviewRepository"
    }
}

fun ReviewDto.toEntity(): ReviewEntity {
    val gson = Gson()
    return ReviewEntity(
        id = this.id ?: UUID.randomUUID().toString(),
        productId = this.productId ?: "",
        userId = this.userId ?: "",
        userName = this.userName ?: "Anonymous",
        rating = this.rating,
        comment = this.comment ?: "",
        images = gson.toJson(this.images),
        helpfulCount = this.helpfulCount,
        createdAt = parseCreatedAtMillis(this.createdAt),
        isVerifiedPurchase = this.isVerifiedPurchase
    )
}

private fun parseCreatedAtMillis(createdAt: String?): Long {
    if (createdAt.isNullOrBlank()) return System.currentTimeMillis()
    return try {
        val instant = java.time.Instant.parse(createdAt)
        instant.toEpochMilli()
    } catch (_: Exception) {
        try {
            val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
            format.timeZone = TimeZone.getTimeZone("UTC")
            format.parse(createdAt)?.time ?: System.currentTimeMillis()
        } catch (_: Exception) {
            System.currentTimeMillis()
        }
    }
}
