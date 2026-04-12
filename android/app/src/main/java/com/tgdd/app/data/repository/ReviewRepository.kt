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

/**
 * Repository for product review management with offline-first strategy.
 * 
 * Data Source Strategy: Local-first with background sync
 * 
 * ## Read Flow (Local-First):
 * 1. Always read from local Room database
 * 2. UI observes Room via Flow for reactive updates
 * 3. Background sync refreshes from server
 * 
 * ## Write Flow (Optimistic Updates):
 * 1. Write to local Room immediately (instant UI feedback)
 * 2. Sync to server in background
 * 3. Server sync failures don't affect local state
 * 
 * ## Caching Mechanism:
 * - [ReviewDao] (Room) as primary data source
 * - Reviews cached locally for offline viewing
 * - Sync behavior: Best-effort background sync
 * 
 * @see ReviewDao For local review storage
 * @see ReviewApi For server operations
 */
class ReviewRepository @Inject constructor(
    private val reviewDao: ReviewDao,
    private val reviewApi: ReviewApi
) {
    private val gson = Gson()

    /**
     * Observes reviews for a product from local cache.
     * 
     * @param productId Product ID to get reviews for
     * @return Flow emitting list of reviews
     */
    fun getReviewsByProductId(productId: String): Flow<List<ReviewEntity>> =
        reviewDao.getReviewsByProductId(productId)

    /**
     * Observes reviews by a user from local cache.
     * 
     * @param userId User ID to get reviews for
     * @return Flow emitting list of user's reviews
     */
    fun getReviewsByUserId(userId: String): Flow<List<ReviewEntity>> =
        reviewDao.getReviewsByUserId(userId)

    /**
     * Calculates average rating for a product from local cache.
     * 
     * @param productId Product ID
     * @return Average rating (0.0 if no reviews)
     */
    suspend fun getAverageRating(productId: String): Double =
        reviewDao.getAverageRating(productId) ?: 0.0

    /**
     * Gets review count for a product from local cache.
     * 
     * @param productId Product ID
     * @return Number of reviews
     */
    suspend fun getReviewCount(productId: String): Int =
        reviewDao.getReviewCount(productId)

    /**
     * Creates a new review with optimistic local-first strategy.
     * 
     * Write Strategy: Optimistic local-first
     * 1. Save to Room immediately
     * 2. Sync to server in background
     * 3. Return local review even if sync fails
     * 
     * @param productId Product being reviewed
     * @param userId User ID of reviewer
     * @param userName Display name of reviewer
     * @param rating Rating (1-5)
     * @param comment Review text
     * @param images Optional image URLs
     * @param isVerifiedPurchase Whether reviewer purchased product
     * @return Result containing created review
     */
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
        
        // Save to local database immediately for instant feedback
        reviewDao.insertReview(review)
        
        // Sync to server in background
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
        
        // Return local review even if sync failed
        return Result.success(review)
    }

    /**
     * Updates an existing review.
     * 
     * @param reviewId Review ID to update
     * @param rating New rating
     * @param comment New comment text
     * @param images New image URLs
     */
    suspend fun updateReview(reviewId: String, rating: Int, comment: String, images: List<String>) {
        val existing = reviewDao.getReviewById(reviewId) ?: return
        val updated = existing.copy(
            rating = rating,
            comment = comment,
            images = gson.toJson(images)
        )
        // Update locally first
        reviewDao.updateReview(updated)
        
        // Sync to server in background
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

    /**
     * Deletes a review.
     * 
     * @param reviewId Review ID to delete
     */
    suspend fun deleteReview(reviewId: String) {
        val review = reviewDao.getReviewById(reviewId) ?: return
        // Delete locally first
        reviewDao.deleteReview(review)
        
        // Sync deletion to server
        if (NetworkObserver.isCurrentlyConnected()) {
            try {
                reviewApi.deleteReview(reviewId)
            } catch (e: Exception) {
                Log.e(TAG, "Delete review sync failed: ${e.message}", e)
            }
        }
    }

    /**
     * Marks a review as helpful (increments helpful count).
     * 
     * @param reviewId Review ID to mark helpful
     */
    suspend fun markHelpful(reviewId: String) {
        val review = reviewDao.getReviewById(reviewId) ?: return
        val updated = review.copy(helpfulCount = review.helpfulCount + 1)
        // Update locally first
        reviewDao.updateReview(updated)
        
        // Sync to server
        if (NetworkObserver.isCurrentlyConnected()) {
            try {
                reviewApi.markHelpful(reviewId)
            } catch (e: Exception) {
                Log.e(TAG, "Mark helpful sync failed: ${e.message}", e)
            }
        }
    }

    /**
     * Syncs reviews for a product from server.
     * 
     * Sync Strategy: Server-wins
     * 1. Fetches from server
     * 2. Clears local reviews for product
     * 3. Inserts server reviews
     * 
     * @param productId Product ID to sync reviews for
     */
    suspend fun syncReviews(productId: String) {
        if (!NetworkObserver.isCurrentlyConnected()) {
            Log.w(TAG, "Cannot sync reviews: no network connection")
            return
        }
        try {
            val response = reviewApi.getReviewsByProductId(productId)
            if (response.isSuccessful) {
                response.body()?.reviews?.let { reviews ->
                    // Replace local cache with server data (server-wins)
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
