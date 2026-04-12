package com.tgdd.app.data.local.dao

import androidx.room.*
import com.tgdd.app.data.local.entity.OrderEntity
import kotlinx.coroutines.flow.Flow

/**
 * Data Access Object for order database operations.
 *
 * Operations:
 * - getAllOrders(): Fetch all cached orders
 * - getOrdersByUserId(): Get orders for specific user
 * - getOrdersByUserIdAndStatus(): Filter orders by status
 * - getOrderById(): Get single order details
 * - insertOrder(): Cache order from network response
 * - updateOrder(): Update order details
 * - updateOrderStatus(): Update order status
 * - deleteOrder(): Remove order from cache
 *
 * Transactions:
 * - All write operations are transaction-safe
 *
 * @see com.tgdd.app.data.local.entity.OrderEntity For entity definition
 */
@Dao
interface OrderDao {
    @Query("SELECT * FROM orders ORDER BY createdAt DESC")
    fun getAllOrders(): Flow<List<OrderEntity>>

    @Query("SELECT * FROM orders WHERE userId = :userId ORDER BY createdAt DESC")
    fun getOrdersByUserId(userId: String): Flow<List<OrderEntity>>

    @Query("SELECT * FROM orders WHERE userId = :userId AND status = :status ORDER BY createdAt DESC")
    fun getOrdersByUserIdAndStatus(userId: String, status: String): Flow<List<OrderEntity>>

    @Query("SELECT * FROM orders WHERE id = :orderId")
    suspend fun getOrderById(orderId: String): OrderEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrder(order: OrderEntity)

    @Update
    suspend fun updateOrder(order: OrderEntity)

    @Query("UPDATE orders SET status = :status WHERE id = :orderId")
    suspend fun updateOrderStatus(orderId: String, status: String)

    @Delete
    suspend fun deleteOrder(order: OrderEntity)
}
