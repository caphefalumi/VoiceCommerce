package com.tgdd.app.data.local.dao

import androidx.room.*
import com.tgdd.app.data.local.entity.WishlistEntity
import kotlinx.coroutines.flow.Flow

/**
 * Data Access Object for wishlist database operations.
 *
 * Operations:
 * - getAllWishlistItems(): Fetch all wishlist items sorted by addition time
 * - getWishlistItemByProductId(): Check if product is in wishlist
 * - isInWishlist(): Flow-based check for UI reactive updates
 * - insertWishlistItem(): Add product to wishlist
 * - deleteWishlistItem(): Remove item from wishlist
 * - deleteByProductId(): Remove by product ID
 * - clearWishlist(): Empty entire wishlist
 * - getWishlistCount(): Get total wishlist item count
 *
 * Transactions:
 * - All write operations are transaction-safe
 *
 * @see com.tgdd.app.data.local.entity.WishlistEntity For entity definition
 */
@Dao
interface WishlistDao {
    @Query("SELECT * FROM wishlist ORDER BY addedAt DESC")
    fun getAllWishlistItems(): Flow<List<WishlistEntity>>

    @Query("SELECT * FROM wishlist WHERE productId = :productId LIMIT 1")
    suspend fun getWishlistItemByProductId(productId: String): WishlistEntity?

    @Query("SELECT EXISTS(SELECT 1 FROM wishlist WHERE productId = :productId)")
    fun isInWishlist(productId: String): Flow<Boolean>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertWishlistItem(item: WishlistEntity)

    @Delete
    suspend fun deleteWishlistItem(item: WishlistEntity)

    @Query("DELETE FROM wishlist WHERE productId = :productId")
    suspend fun deleteByProductId(productId: String)

    @Query("DELETE FROM wishlist")
    suspend fun clearWishlist()

    @Query("SELECT COUNT(*) FROM wishlist")
    fun getWishlistCount(): Flow<Int>
}
