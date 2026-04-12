package com.tgdd.app.data.local.dao

import androidx.room.*
import com.tgdd.app.data.local.entity.CartItemEntity
import kotlinx.coroutines.flow.Flow

/**
 * Data Access Object for shopping cart database operations.
 *
 * Operations:
 * - getCartItems(): Fetch all cart items sorted by addition time
 * - getCartItemByProductId(): Check if product exists in cart
 * - getCartTotal(): Calculate total price of all items
 * - getCartItemCount(): Get total number of items in cart
 * - insertCartItem(): Add item to cart (returns auto-generated ID)
 * - updateCartItem(): Update cart item details
 * - updateQuantity(): Quick update item quantity
 * - deleteCartItem(): Remove item from cart
 * - removeCartItemById(): Remove by cart item ID
 * - removeCartItemByProductId(): Remove by product ID
 * - clearCart(): Empty the entire cart
 *
 * Transactions:
 * - All write operations are transaction-safe
 *
 * @see com.tgdd.app.data.local.entity.CartItemEntity For entity definition
 */
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
