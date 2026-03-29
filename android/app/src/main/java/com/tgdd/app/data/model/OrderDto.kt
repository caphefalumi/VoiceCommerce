package com.tgdd.app.data.model

import com.google.gson.annotations.SerializedName

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
