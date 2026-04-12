package com.tgdd.app.data.repository

import android.content.Context
import android.util.Log
import com.tgdd.app.data.local.dao.OrderDao
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

/**
 * Repository for order management with offline-first strategy.
 * 
 * Data Source Strategy: Local-first with background sync
 * 
 * ## Read Flow (Local-First):
 * 1. Always read from local Room database
 * 2. UI observes Room via Flow for reactive updates
 * 3. Background sync pulls latest orders from server
 * 
 * ## Write Flow (Local-First + Server Sync):
 * 1. Create order locally first (for offline support)
 * 2. Clear cart after order creation
 * 3. Sync to server in background (best-effort)
 * 4. Local order persists even if server sync fails
 * 
 * ## Caching Mechanism:
 * - [OrderDao] (Room) as primary data source
 * - Orders serialized as JSON in Room
 * - Sync behavior: Best-effort background sync
 * 
 * @see OrderDao For local order storage
 * @see OrderApi For server operations
 */
class OrderRepository @Inject constructor(
    private val orderDao: OrderDao,
    private val cartRepository: CartRepository,
    private val orderApi: OrderApi,
    @ApplicationContext private val context: Context
) {
    private val gson = Gson()

    /**
     * Observes all orders from local cache.
     * 
     * @return Flow emitting all orders
     */
    fun getAllOrders(): Flow<List<OrderEntity>> = orderDao.getAllOrders()

    /**
     * Alias for getAllOrders().
     */
    fun getOrders(): Flow<List<OrderEntity>> = orderDao.getAllOrders()

    /**
     * Observes orders filtered by user ID.
     * 
     * @param userId User ID to filter orders
     * @return Flow emitting orders for the user
     */
    fun getOrdersByUserId(userId: String): Flow<List<OrderEntity>> = orderDao.getOrdersByUserId(userId)

    /**
     * Observes orders filtered by user ID and status.
     * 
     * @param userId User ID to filter orders
     * @param status Order status to filter
     * @return Flow emitting matching orders
     */
    fun getOrdersByUserIdAndStatus(userId: String, status: String): Flow<List<OrderEntity>> =
        orderDao.getOrdersByUserIdAndStatus(userId, status)

    /**
     * Gets a single order by ID from local cache.
     * 
     * @param id Order ID
     * @return Order entity or null if not found
     */
    suspend fun getOrderById(id: String): OrderEntity? = orderDao.getOrderById(id)

    /**
     * Observes orders filtered by status.
     * 
     * @param status Order status to filter
     * @return Flow emitting orders with matching status
     */
    fun getOrdersByStatus(status: String): Flow<List<OrderEntity>> = orderDao.getAllOrders().map { orders ->
        orders.filter { it.status == status }
    }

    /**
     * Creates a new order from current cart contents.
     * 
     * Write Strategy: API-first
     * 1. Get cart items from CartRepository (API)
     * 2. Create order locally with "preparing" status
     * 3. Clear the cart via API
     * 4. Sync to server in background
     * 
     * Order is persisted locally even if server sync fails.
     * 
     * @param customerName Customer name for shipping
     * @param customerPhone Customer phone for shipping
     * @param address Full shipping address
     * @param paymentMethod Payment method chosen
     * @param userId User ID (optional)
     * @param userEmail User email (optional)
     * @param discountedTotal Discounted total if promo applied
     * @return Generated order ID
     * @throws Exception if cart is empty
     */
    suspend fun createOrder(
        customerName: String,
        customerPhone: String,
        address: String,
        paymentMethod: String,
        userId: String = "",
        userEmail: String = "",
        discountedTotal: Double? = null
    ): String {
        // Get current cart items from API
        val cartItems = cartRepository.getCartItems().first()
        if (cartItems.isEmpty()) throw Exception("Giỏ hàng trống")
        
        // Calculate totals
        val rawTotal = cartItems.sumOf { it.price * it.quantity }
        val total = discountedTotal?.coerceAtLeast(0.0)?.coerceAtMost(rawTotal) ?: rawTotal
        val orderId = UUID.randomUUID().toString()

        // Parse address + city (address is already "street, city" from CheckoutViewModel)
        val parts = address.split(",").map { it.trim() }
        val street = parts.dropLast(1).joinToString(", ").ifBlank { address }
        val city = parts.lastOrNull()?.takeIf { parts.size > 1 } ?: ""

        // Create order entity
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

        // Save to local database first
        orderDao.insertOrder(order)
        
        // Sync to server (REQUIRED - don't clear cart if this fails)
        var serverOrderCreated = false
        if (NetworkObserver.isCurrentlyConnected()) {
            try {
                val orderData = mapOf(
                    "user_id" to userId,
                    "user_name" to customerName,
                    "user_email" to userEmail,
                    "items" to cartItems.map { mapOf(
                        "productId" to (it.productId ?: ""),
                        "name" to (it.name ?: ""),
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
                    serverOrderCreated = true
                } else {
                    val errorBody = response.errorBody()?.string()
                    Log.e(TAG, "Order sync failed: ${response.code()} - ${response.body()?.error ?: response.message()} - $errorBody")
                    throw Exception("Failed to create order on server: ${response.body()?.error ?: response.message()}")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Order sync failed: ${e.message}", e)
                throw e
            }
        } else {
            throw Exception("No network connection")
        }
        
        // Only clear cart if server order was created successfully
        if (serverOrderCreated) {
            cartRepository.clearCart()
        }

        return orderId
    }

    /**
     * Updates order status locally and syncs to server.
     * 
     * @param orderId Order ID to update
     * @param newStatus New status value
     */
    suspend fun updateOrderStatus(orderId: String, newStatus: String) {
        // Update locally first
        orderDao.updateOrderStatus(orderId, newStatus)
        // Sync to server in background
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

    /**
     * Cancels an order by updating status to "cancelled".
     * 
     * @param order Order entity to cancel
     */
    suspend fun cancelOrder(order: OrderEntity) {
        orderDao.updateOrderStatus(order.id, "cancelled")
    }

    /**
     * Syncs orders from server to local cache.
     * 
     * Sync Strategy: Pull from server, merge into local
     * Server orders are inserted (may create duplicates if not managed)
     * 
     * @param userId User ID to fetch orders for
     */
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

    /**
     * Creates a Stripe checkout session for online payment.
     * 
     * @param customerName Customer name
     * @param customerPhone Customer phone
     * @param address Shipping address
     * @param userId User ID (optional)
     * @param userEmail User email (optional)
     * @return Stripe checkout URL
     * @throws Exception if session creation fails
     */
    suspend fun createStripeCheckoutSession(
        customerName: String,
        customerPhone: String,
        address: String,
        userId: String = "",
        userEmail: String = ""
    ): String {
        // Get cart items from API
        val cartItems = cartRepository.getCartItems().first()
        if (cartItems.isEmpty()) throw Exception("Giỏ hàng trống")
        val total = cartItems.sumOf { it.price * it.quantity }

        // Parse address
        val parts = address.split(",").map { it.trim() }
        val street = parts.dropLast(1).joinToString(", ").ifBlank { address }
        val city = parts.lastOrNull()?.takeIf { parts.size > 1 } ?: ""

        // Create Stripe checkout session
        val sessionResponse = orderApi.createCheckoutSession(
            mapOf(
                "user_id" to userId,
                "user_name" to customerName,
                "user_email" to userEmail,
                "user_phone" to customerPhone,
                "items" to cartItems.map { mapOf(
                    "productId" to (it.productId ?: ""),
                    "name" to (it.name ?: ""),
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

    /**
     * Checks payment status from Stripe.
     * 
     * @param sessionId Stripe checkout session ID
     * @return Payment status string
     * @throws Exception if network unavailable or request fails
     */
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
        val cartItems = localGson.fromJson(this.items, Array<CartItemDto>::class.java)
        cartItems.map { mapOf(
            "productId" to (it.productId ?: ""),
            "name" to (it.name ?: ""),
            "image" to it.getImage(),
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
        CartItemDto(
            id = null,
            productId = item["productId"]?.toString(),
            name = item["name"]?.toString(),
            images = listOfNotNull(item["image"]?.toString()),
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
