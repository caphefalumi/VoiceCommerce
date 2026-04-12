package com.tgdd.app.data.model

import com.google.gson.JsonElement
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

// Stripe checkout session response
data class CheckoutSessionResponse(
    @SerializedName("sessionId")
    val sessionId: String? = null,
    @SerializedName("url")
    val url: String? = null,
    @SerializedName("error")
    val error: String? = null
)

// Stripe payment status response
data class PaymentStatusResponse(
    @SerializedName("status")
    val status: String? = null, // "paid", "unpaid", "canceled"
    @SerializedName("orderId")
    val orderId: String? = null,
    @SerializedName("error")
    val error: String? = null
)

// Review responses
data class ReviewsResponse(
    @SerializedName("reviews")
    val reviews: List<ReviewDto>? = null,
    @SerializedName("average_rating")
    val averageRating: Double? = null,
    @SerializedName("total_count")
    val totalCount: Int? = null
)

data class ReviewResponse(
    @SerializedName("review")
    val review: ReviewDto? = null,
    @SerializedName("message")
    val message: String? = null,
    @SerializedName("error")
    val error: String? = null
)

// Wishlist responses
data class WishlistResponse(
    @SerializedName("wishlist")
    val wishlist: List<ProductDto>? = null,
    @SerializedName("total_items")
    val totalItems: Int? = null
)

// Promo code responses
data class PromoCodesResponse(
    @SerializedName("promo_codes")
    val promoCodes: List<PromoCodeDto>? = null
)

data class PromoCodeDto(
    @SerializedName("code")
    val code: String,
    @SerializedName("discount_type")
    val discountType: String,
    @SerializedName("discount_value")
    val discountValue: Double,
    @SerializedName("min_order_value")
    val minOrderValue: Double = 0.0,
    @SerializedName("max_discount")
    val maxDiscount: Double? = null,
    @SerializedName("expires_at")
    val expiresAt: Long,
    @SerializedName("description")
    val description: String = ""
)

data class PromoCodeValidationResponse(
    @SerializedName("valid")
    val valid: Boolean,
    @SerializedName("discount_amount")
    val discountAmount: Double? = null,
    @SerializedName("message")
    val message: String? = null,
    @SerializedName("error")
    val error: String? = null
)

data class PromoCodeApplicationResponse(
    @SerializedName("success")
    val success: Boolean,
    @SerializedName("discount_amount")
    val discountAmount: Double? = null,
    @SerializedName("final_total")
    val finalTotal: Double? = null,
    @SerializedName("message")
    val message: String? = null,
    @SerializedName("error")
    val error: String? = null
)

data class CouponApplyResponse(
    @SerializedName("success")
    val success: Boolean,
    @SerializedName("coupon_code")
    val couponCode: String? = null,
    @SerializedName("discount_type")
    val discountType: String? = null,
    @SerializedName("discount_value")
    val discountValue: Double? = null,
    @SerializedName("subtotal")
    val subtotal: Double? = null,
    @SerializedName("discount_amount")
    val discountAmount: Double? = null,
    @SerializedName("final_total")
    val finalTotal: Double? = null,
    @SerializedName("description")
    val description: String? = null,
    @SerializedName("message")
    val message: String? = null,
    @SerializedName("error")
    val error: String? = null
)

// Address response
data class AddressListResponse(
    @SerializedName("addresses")
    val addresses: List<AddressDto>? = null
)

data class AddressDto(
    @SerializedName("id")
    val id: Long? = null,
    @SerializedName("user_id")
    val userId: String?,
    @SerializedName("name")
    val name: String,
    @SerializedName("phone")
    val phone: String,
    @SerializedName("street")
    val street: String,
    @SerializedName("city")
    val city: String,
    @SerializedName("district")
    val district: String = "",
    @SerializedName("ward")
    val ward: String = "",
    @SerializedName("is_default")
    val isDefault: Boolean = false,
    @SerializedName("label")
    val label: String = "Home"
)

object ApiResponses {
    // Wrapper for all response types
    data class ProductListResponse(val products: List<ProductDto>? = null)
    data class ProductResponse(val product: ProductDto? = null)
    data class UserResponse(val user: UserDto? = null)
    data class OrderListResponse(val orders: List<OrderDto>? = null)
    data class OrderResponse(val order: OrderDto? = null)
    data class OrderCreateResponse(
        val id: String? = null,
        val status: String? = null,
        val totalPrice: Double? = null,
        val confirmationText: String? = null,
        val message: String? = null,
        val error: String? = null
    )
    data class CartResponse(
        val cart: List<CartItemDto>? = null,
        val totalItems: Int? = null,
        val totalPrice: Double? = null
    )
    data class AddToCartResponse(
        val id: String? = null,
        val message: String? = null,
        val success: Boolean = false
    )
    data class MessageResponse(
        val message: String? = null,
        val success: Boolean? = null,
        val error: String? = null
    )
    data class TicketCreateResponse(
        val id: String? = null,
        val shortId: String? = null,
        val status: String? = null,
        val categoryLabel: String? = null,
        val confirmationText: String? = null,
        val message: String? = null,
        val error: String? = null
    )
    data class TicketListResponse(val tickets: List<TicketDto>? = null)
    data class CheckoutSessionResponse(
        val sessionId: String? = null,
        val url: String? = null,
        val error: String? = null
    )
    data class PaymentStatusResponse(
        val status: String? = null,
        val orderId: String? = null,
        val error: String? = null
    )
    data class ReviewsResponse(
        val reviews: List<ReviewDto>? = null,
        @SerializedName("average_rating")
        val averageRating: Double? = null,
        @SerializedName("total_count")
        val totalCount: Int? = null
    )
    data class ReviewResponse(
        val review: ReviewDto? = null,
        val message: String? = null,
        val error: String? = null
    )
    data class WishlistResponse(
        val wishlist: List<ProductDto>? = null,
        val totalItems: Int? = null
    )
    data class PromoCodesResponse(val promoCodes: List<PromoCodeDto>? = null)
    data class PromoCodeValidationResponse(
        val valid: Boolean,
        val discountAmount: Double? = null,
        val message: String? = null,
        val error: String? = null
    )
    data class PromoCodeApplicationResponse(
        val success: Boolean,
        val discountAmount: Double? = null,
        val finalTotal: Double? = null,
        val message: String? = null,
        val error: String? = null
    )
    data class CouponApplyResponse(
        val success: Boolean,
        val couponCode: String? = null,
        val discountType: String? = null,
        val discountValue: Double? = null,
        val subtotal: Double? = null,
        val discountAmount: Double? = null,
        val finalTotal: Double? = null,
        val description: String? = null,
        val message: String? = null,
        val error: String? = null
    )
    data class AddressListResponse(val addresses: List<AddressDto>? = null)
}

data class AiVoiceRequest(
    @SerializedName("text")
    val text: String? = null,
    @SerializedName("audio_base64")
    val audioBase64: String? = null,
    @SerializedName("session_id")
    val sessionId: String? = null,
    @SerializedName("context")
    val context: AiVoiceContext? = null,
)

data class AiVoiceContext(
    @SerializedName("user_id")
    val userId: String? = null,
)

data class AiVoiceResponse(
    @SerializedName("transcribed_text")
    val transcribedText: String? = null,
    @SerializedName("response_text")
    val responseText: String? = null,
    @SerializedName("action")
    val action: JsonElement? = null,
    @SerializedName("search_results")
    val searchResults: List<AiSearchResult>? = null,
    @SerializedName("error")
    val error: String? = null,
)

data class AiSearchResult(
    @SerializedName("id")
    val id: String,
    @SerializedName("name")
    val name: String,
    @SerializedName("price")
    val price: Double? = null,
    @SerializedName("brand")
    val brand: String? = null,
    @SerializedName("category")
    val category: String? = null,
    @SerializedName("index")
    val index: Int? = null,
)
