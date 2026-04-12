package com.tgdd.app.data.local.dao

import androidx.room.*
import com.tgdd.app.data.local.entity.ReviewEntity
import kotlinx.coroutines.flow.Flow

/**
 * Data Access Object for review database operations.
 *
 * Operations:
 * - getReviewsByProductId(): Fetch reviews for specific product
 * - getReviewsByUserId(): Fetch reviews written by user
 * - getReviewById(): Get single review by ID
 * - getAverageRating(): Calculate average rating for product
 * - getReviewCount(): Get total review count for product
 * - insertReview(): Cache review from network response
 * - updateReview(): Update review details
 * - deleteReview(): Remove review from cache
 * - deleteReviewsByProductId(): Remove all reviews for product
 *
 * Transactions:
 * - All write operations are transaction-safe
 *
 * @see com.tgdd.app.data.local.entity.ReviewEntity For entity definition
 */
@Dao
interface ReviewDao {
    @Query("SELECT * FROM reviews WHERE productId = :productId ORDER BY createdAt DESC")
    fun getReviewsByProductId(productId: String): Flow<List<ReviewEntity>>

    @Query("SELECT * FROM reviews WHERE userId = :userId ORDER BY createdAt DESC")
    fun getReviewsByUserId(userId: String): Flow<List<ReviewEntity>>

    @Query("SELECT * FROM reviews WHERE id = :id")
    suspend fun getReviewById(id: String): ReviewEntity?

    @Query("SELECT AVG(rating) FROM reviews WHERE productId = :productId")
    suspend fun getAverageRating(productId: String): Double?

    @Query("SELECT COUNT(*) FROM reviews WHERE productId = :productId")
    suspend fun getReviewCount(productId: String): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertReview(review: ReviewEntity)

    @Update
    suspend fun updateReview(review: ReviewEntity)

    @Delete
    suspend fun deleteReview(review: ReviewEntity)

    @Query("DELETE FROM reviews WHERE productId = :productId")
    suspend fun deleteReviewsByProductId(productId: String)
}
