package com.tgdd.app.data.model

import com.google.gson.annotations.SerializedName

data class ProductListResponse(
    @SerializedName("products")
    val products: List<ProductDto>? = null
)

data class ProductResponse(
    @SerializedName("product")
    val product: ProductDto? = null
)

data class UserResponse(
    @SerializedName("user")
    val user: UserDto? = null
)

data class OrderListResponse(
    @SerializedName("orders")
    val orders: List<OrderDto>? = null
)

data class OrderResponse(
    @SerializedName("order")
    val order: OrderDto? = null
)

data class OrderCreateResponse(
    @SerializedName("id")
    val id: String? = null,
    @SerializedName("status")
    val status: String? = null,
    @SerializedName("total_price")
    val totalPrice: Double? = null,
    @SerializedName("confirmation_text")
    val confirmationText: String? = null,
    @SerializedName("message")
    val message: String? = null,
    @SerializedName("error")
    val error: String? = null
)

data class CartResponse(
    @SerializedName("cart")
    val cart: List<CartItemDto>? = null,
    @SerializedName("total_items")
    val totalItems: Int? = null,
    @SerializedName("total_price")
    val totalPrice: Double? = null
)

data class AddToCartResponse(
    @SerializedName("id")
    val id: String? = null,
    @SerializedName("message")
    val message: String? = null,
    @SerializedName("success")
    val success: Boolean = false
)

data class MessageResponse(
    @SerializedName("message")
    val message: String? = null,
    @SerializedName("success")
    val success: Boolean? = null
)

data class TicketCreateResponse(
    @SerializedName("id")
    val id: String? = null,
    @SerializedName("short_id")
    val shortId: String? = null,
    @SerializedName("status")
    val status: String? = null,
    @SerializedName("category_label")
    val categoryLabel: String? = null,
    @SerializedName("confirmation_text")
    val confirmationText: String? = null,
    @SerializedName("message")
    val message: String? = null,
    @SerializedName("error")
    val error: String? = null
)

data class TicketListResponse(
    @SerializedName("tickets")
    val tickets: List<TicketDto>? = null
)

data class TicketDto(
    @SerializedName("id")
    val id: String? = null,
    @SerializedName("user_id")
    val userId: String? = null,
    @SerializedName("category")
    val category: String? = null,
    @SerializedName("category_label")
    val categoryLabel: String? = null,
    @SerializedName("message")
    val message: String? = null,
    @SerializedName("status")
    val status: String? = null,
    @SerializedName("short_id")
    val shortId: String? = null,
    @SerializedName("created_at")
    val createdAt: String? = null
)
