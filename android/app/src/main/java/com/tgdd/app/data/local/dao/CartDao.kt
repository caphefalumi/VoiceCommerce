package com.tgdd.app.data.local.dao

import androidx.room.*
import com.tgdd.app.data.local.entity.CartItemEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface CartDao {
    @Query("SELECT * FROM cart_items ORDER BY addedAt DESC")
    fun getCartItems(): Flow<List<CartItemEntity>>
    
    @Query("SELECT * FROM cart_items WHERE productId = :productId")
    suspend fun getCartItemByProductId(productId: String): CartItemEntity?
    
    @Query("SELECT SUM(price * quantity) FROM cart_items")
    fun getCartTotal(): Flow<Double?>
    
    @Query("SELECT SUM(quantity) FROM cart_items")
    fun getCartItemCount(): Flow<Int?>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCartItem(item: CartItemEntity): Long
    
    @Update
    suspend fun updateCartItem(item: CartItemEntity)
    
    @Query("UPDATE cart_items SET quantity = :quantity WHERE id = :itemId")
    suspend fun updateQuantity(itemId: Long, quantity: Int)
    
    @Delete
    suspend fun deleteCartItem(item: CartItemEntity)
    
    @Query("DELETE FROM cart_items WHERE id = :itemId")
    suspend fun removeCartItemById(itemId: Long)
    
    @Query("DELETE FROM cart_items WHERE productId = :productId")
    suspend fun removeCartItemByProductId(productId: String)
    
    @Query("DELETE FROM cart_items")
    suspend fun clearCart()
}
