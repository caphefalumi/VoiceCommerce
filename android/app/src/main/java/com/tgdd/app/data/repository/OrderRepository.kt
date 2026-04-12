package com.tgdd.app.data.repository

import android.content.Context
import android.util.Log
import com.tgdd.app.data.local.dao.CartDao
import com.tgdd.app.data.local.dao.OrderDao
import com.tgdd.app.data.local.entity.CartItemEntity
import com.tgdd.app.data.local.entity.OrderEntity
import com.tgdd.app.data.model.CartItemDto
import com.tgdd.app.data.model.OrderDto
import com.tgdd.app.data.network.NetworkObserver
import com.tgdd.app.data.remote.OrderApi
import com.google.gson.Gson
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import java.util.UUID
import javax.inject.Inject

class OrderRepository @Inject constructor(
    private val orderDao: OrderDao,
    private val cartDao: CartDao,
    private val orderApi: OrderApi,
    @ApplicationContext private val context: Context
) {
    private val gson = Gson()

    fun getAllOrders(): Flow<List<OrderEntity>> = orderDao.getAllOrders()

    fun getOrders(): Flow<List<OrderEntity>> = orderDao.getAllOrders()

    fun getOrdersByUserId(userId: String): Flow<List<OrderEntity>> = orderDao.getOrdersByUserId(userId)

    fun getOrdersByUserIdAndStatus(userId: String, status: String): Flow<List<OrderEntity>> =
        orderDao.getOrdersByUserIdAndStatus(userId, status)

    suspend fun getOrderById(id: String): OrderEntity? = orderDao.getOrderById(id)

    fun getOrdersByStatus(status: String): Flow<List<OrderEntity>> = orderDao.getAllOrders().map { orders ->
        orders.filter { it.status == status }
    }

    suspend fun createOrder(
        customerName: String,
        customerPhone: String,
        address: String,
        paymentMethod: String,
        userId: String = "",
        userEmail: String = "",
        discountedTotal: Double? = null
    ): String {
        val cartItems = cartDao.getCartItems().first()
        if (cartItems.isEmpty()) throw Exception("Giỏ hàng trống")
        val rawTotal = cartItems.sumOf { it.price * it.quantity }
        val total = discountedTotal?.coerceAtLeast(0.0)?.coerceAtMost(rawTotal) ?: rawTotal
        val orderId = UUID.randomUUID().toString()

        // Parse address + city (address is already "street, city" from CheckoutViewModel)
        val parts = address.split(",").map { it.trim() }
        val street = parts.dropLast(1).joinToString(", ").ifBlank { address }
        val city = parts.lastOrNull()?.takeIf { parts.size > 1 } ?: ""

        val order = OrderEntity(
            id = orderId,
            userId = userId,
            items = gson.toJson(cartItems),
            total = total,
            status = "preparing",
            address = address,
            customerName = customerName,
            customerPhone = customerPhone,
            paymentMethod = paymentMethod
        )

        orderDao.insertOrder(order)
        cartDao.clearCart()

        if (NetworkObserver.isCurrentlyConnected()) {
            try {
                val orderData = mapOf(
                    "user_id" to userId,
                    "user_name" to customerName,
                    "user_email" to userEmail,
                    "items" to cartItems.map { mapOf(
                        "productId" to it.productId,
                        "name" to it.name,
                        "price" to it.price,
                        "quantity" to it.quantity
                    ) },
                    "total_price" to total,
                    "shipping_address" to mapOf(
                        "name" to customerName,
                        "phone" to customerPhone,
                        "address" to street,
                        "city" to city
                    )
                )
                val response = orderApi.createOrder(orderData)
                if (response.isSuccessful) {
                    Log.d(TAG, "Order synced to server: $orderId")
                } else {
                    Log.e(TAG, "Order sync failed: ${response.code()} - ${response.body()?.error ?: response.message()}")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Order sync failed: ${e.message}", e)
            }
        }

        return orderId
    }

    suspend fun updateOrderStatus(orderId: String, newStatus: String) {
        orderDao.updateOrderStatus(orderId, newStatus)
        if (NetworkObserver.isCurrentlyConnected()) {
            try {
                val response = orderApi.updateOrderStatus(orderId, mapOf("status" to newStatus))
                if (!response.isSuccessful) {
                    Log.e(TAG, "Update order status sync failed: ${response.code()}")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Update order status sync failed: ${e.message}", e)
            }
        }
    }

    suspend fun cancelOrder(order: OrderEntity) {
        orderDao.updateOrderStatus(order.id, "cancelled")
    }

    suspend fun syncOrders(userId: String) {
        if (!NetworkObserver.isCurrentlyConnected()) {
            Log.w(TAG, "Cannot sync orders: no network connection")
            return
        }
        try {
            val response = orderApi.getOrders(userId)
            if (response.isSuccessful) {
                response.body()?.orders?.let { orders ->
                    orders.forEach { order ->
                        orderDao.insertOrder(order.toEntity())
                    }
                    Log.d(TAG, "Synced ${orders.size} orders from server")
                }
            } else {
                Log.e(TAG, "Sync orders failed: ${response.code()}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Sync orders failed: ${e.message}", e)
        }
    }

    suspend fun createStripeCheckoutSession(
        customerName: String,
        customerPhone: String,
        address: String,
        userId: String = "",
        userEmail: String = ""
    ): String {
        val cartItems = cartDao.getCartItems().first()
        if (cartItems.isEmpty()) throw Exception("Giỏ hàng trống")
        val total = cartItems.sumOf { it.price * it.quantity }

        val parts = address.split(",").map { it.trim() }
        val street = parts.dropLast(1).joinToString(", ").ifBlank { address }
        val city = parts.lastOrNull()?.takeIf { parts.size > 1 } ?: ""

        val sessionResponse = orderApi.createCheckoutSession(
            mapOf(
                "user_id" to userId,
                "user_name" to customerName,
                "user_email" to userEmail,
                "user_phone" to customerPhone,
                "items" to cartItems.map { mapOf(
                    "productId" to it.productId,
                    "name" to it.name,
                    "price" to it.price,
                    "quantity" to it.quantity
                ) },
                "total_price" to total,
                "shipping_address" to mapOf(
                    "name" to customerName,
                    "phone" to customerPhone,
                    "address" to street,
                    "city" to city
                )
            )
        )
        
        if (!sessionResponse.isSuccessful) {
            throw Exception(sessionResponse.body()?.error ?: "Failed to create checkout session")
        }
        
        val checkoutUrl = sessionResponse.body()?.url
        if (checkoutUrl.isNullOrBlank()) {
            throw Exception("No checkout URL returned")
        }
        
        return checkoutUrl
    }

    suspend fun getPaymentStatus(sessionId: String): String {
        if (!NetworkObserver.isCurrentlyConnected()) {
            throw Exception("No network connection")
        }
        val response = orderApi.getPaymentStatus(sessionId)
        if (!response.isSuccessful) {
            throw Exception(response.body()?.error ?: "Failed to check payment status")
        }
        return response.body()?.status ?: "unknown"
    }

    companion object {
        private const val TAG = "OrderRepository"
    }
}

fun OrderEntity.toDto(): OrderDto {
    val localGson = Gson()
    val items = try {
        val cartItems = localGson.fromJson(this.items, Array<CartItemEntity>::class.java)
        cartItems.map { mapOf(
            "productId" to it.productId,
            "name" to it.name,
            "image" to it.image,
            "price" to it.price,
            "quantity" to it.quantity
        ) }
    } catch (e: Exception) {
        Log.e("OrderRepository", "Failed to parse order items: ${e.message}", e)
        emptyList()
    }

    return OrderDto(
        id = this.id,
        userId = this.userId,
        items = items,
        totalPrice = this.total,
        status = this.status,
        shippingAddress = mapOf(
            "address" to this.address,
            "name" to this.customerName,
            "phone" to this.customerPhone
        )
    )
}

fun OrderDto.toEntity(): OrderEntity {
    val localGson = Gson()
    val items = this.items?.map { item ->
        CartItemEntity(
            id = 0,
            productId = item["productId"]?.toString() ?: "",
            name = item["name"]?.toString() ?: "",
            image = item["image"]?.toString() ?: "",
            price = (item["price"] as? Number)?.toDouble() ?: 0.0,
            quantity = (item["quantity"] as? Number)?.toInt() ?: 1
        )
    } ?: emptyList()
    val itemsJson = localGson.toJson(items)

    val address = this.shippingAddress?.get("address")?.toString() ?: ""
    val customerName = this.shippingAddress?.get("name")?.toString() ?: ""
    val customerPhone = this.shippingAddress?.get("phone")?.toString() ?: ""

    return OrderEntity(
        id = this.id ?: UUID.randomUUID().toString(),
        userId = this.userId ?: "",
        items = itemsJson,
        total = this.totalPrice ?: 0.0,
        status = this.status,
        address = address,
        customerName = customerName,
        customerPhone = customerPhone,
        paymentMethod = ""
    )
}
