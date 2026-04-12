package com.tgdd.app.data.model

import com.google.gson.annotations.SerializedName

/**
 * Data Transfer Object for Order from API.
 *
 * Maps to: GET /api/v1/orders, POST /api/v1/orders
 *
 * Example JSON:
 * {
 *   "id": "order_123",
 *   "user_id": "user_456",
 *   "status": "pending",
 *   "total_price": 1998000.0,
 *   "items": [{"product_id": "prod_789", "name": "iPhone", "price": 999000, "quantity": 2}],
 *   "shipping_address": {"street": "123 Main St", "city": "Hanoi", "phone": "0123456789"},
 *   "short_id": "TGDD-123456",
 *   "status_text": "Pending Payment",
 *   "created_at": "2024-01-15T10:30:00Z"
 * }
 *
 * @property id Order unique ID
 * @property userId User ID who placed the order
 * @property status Order status (pending, paid, shipped, delivered, cancelled)
 * @property totalPrice Total order amount in VND
 * @property items List of order items (product_id, name, price, quantity)
 * @property shippingAddress Shipping info (street, city, phone)
 * @property shortId Human-readable order ID
 * @property statusText Display status text
 * @property createdAt Order creation timestamp
 *
 * @see Order For Room database entity
 */
data class OrderDto(
    @SerializedName("id")
    val id: String? = null,
    @SerializedName("user_id")
    val userId: String? = null,
    @SerializedName("status")
    val status: String = "pending",
    @SerializedName("total_price")
    val totalPrice: Double? = null,
    @SerializedName("items")
    val items: List<Map<String, Any>>? = null,
    @SerializedName("shipping_address")
    val shippingAddress: Map<String, Any>? = null,
    @SerializedName("short_id")
    val shortId: String? = null,
    @SerializedName("status_text")
    val statusText: String? = null,
    @SerializedName("created_at")
    val createdAt: String? = null
)
