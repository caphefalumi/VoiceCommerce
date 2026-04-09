package com.tgdd.app.data.local.dao

import androidx.room.*
import com.tgdd.app.data.local.entity.WishlistEntity
import kotlinx.coroutines.flow.Flow

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
