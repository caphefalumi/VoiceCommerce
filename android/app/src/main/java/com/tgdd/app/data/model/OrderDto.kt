package com.tgdd.app.data.model

data class OrderDto(
    val id: String? = null,
    val userId: String? = null,
    val status: String = "pending",
    val totalPrice: Double? = null,
    val items: List<Map<String, Any>>? = null,
    val shippingAddress: Map<String, Any>? = null,
    val shortId: String? = null,
    val statusText: String? = null,
    val createdAt: String? = null
)
