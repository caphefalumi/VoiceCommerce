package com.tgdd.app.data.model

import com.google.gson.JsonElement
import com.google.gson.annotations.SerializedName

/**
 * Response wrapper for product list endpoints.
 *
 * Maps to: GET /api/v1/products
 *
 * @property products List of ProductDto items
 */
data class ProductListResponse(
    @SerializedName("products")
    val products: List<ProductDto>? = null
)

/**
 * Response wrapper for single product endpoint.
 *
 * Maps to: GET /api/v1/products/{id}
 *
 * @property product The product data
 */
data class ProductResponse(
    @SerializedName("product")
    val product: ProductDto? = null
)

/**
 * Response wrapper for user data endpoint.
 *
 * Maps to: GET /api/v1/user/me
 *
 * @property user The user data
 */
data class UserResponse(
    @SerializedName("user")
    val user: UserDto? = null
)

/**
 * Response wrapper for order list endpoint.
 *
 * Maps to: GET /api/v1/orders
 *
 * @property orders List of OrderDto items
 */
data class OrderListResponse(
    @SerializedName("orders")
    val orders: List<OrderDto>? = null
)

/**
 * Response wrapper for single order endpoint.
 *
 * Maps to: GET /api/v1/orders/{id}
 *
 * @property order The order data
 */
data class OrderResponse(
    @SerializedName("order")
    val order: OrderDto? = null
)

/**
 * Response from order creation.
 *
 * Maps to: POST /api/v1/orders
 *
 * @property id Created order ID
 * @property status Order status
 * @property totalPrice Order total
 * @property confirmationText Confirmation message
 * @property message Response message
 * @property error Error message if failed
 */
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

/**
 * Response from cart retrieval.
 *
 * Maps to: GET /api/v1/cart
 *
 * @property cart List of cart items
 * @property totalItems Total item count
 * @property totalPrice Total cart value
 */
data class CartResponse(
    @SerializedName("cart")
    val cart: List<CartItemDto>? = null,
    @SerializedName("total_items")
    val totalItems: Int? = null,
    @SerializedName("total_price")
    val totalPrice: Double? = null
)

/**
 * Response from add to cart operation.
 *
 * Maps to: POST /api/v1/cart/items
 *
 * @property id Cart item ID
 * @property message Response message
 * @property success Whether operation succeeded
 */
data class AddToCartResponse(
    @SerializedName("id")
    val id: String? = null,
    @SerializedName("message")
    val message: String? = null,
    @SerializedName("success")
    val success: Boolean = false
)

/**
 * Generic message response.
 *
 * @property message Response message
 * @property success Whether operation succeeded
 */
data class MessageResponse(
    @SerializedName("message")
    val message: String? = null,
    @SerializedName("success")
    val success: Boolean? = null
)

/**
 * Response from ticket/contact creation.
 *
 * Maps to: POST /api/v1/tickets
 *
 * @property id Created ticket ID
 * @property shortId Human-readable ticket ID
 * @property status Ticket status
 * @property categoryLabel Category display name
 * @property confirmationText Confirmation message
 * @property message Response message
 * @property error Error message if failed
 */
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

/**
 * Response wrapper for ticket list.
 *
 * Maps to: GET /api/v1/tickets
 *
 * @property tickets List of TicketDto items
 */
data class TicketListResponse(
    @SerializedName("tickets")
    val tickets: List<TicketDto>? = null
)

/**
 * Data Transfer Object for Support Ticket.
 *
 * Maps to: GET /api/v1/tickets
 *
 * @property id Ticket unique ID
 * @property userId User ID who created ticket
 * @property category Ticket category
 * @property categoryLabel Category display name
 * @property message Ticket message
 * @property status Ticket status
 * @property shortId Human-readable ticket ID
 * @property createdAt Creation timestamp
 */
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
/**
 * Response from Stripe checkout session creation.
 *
 * Maps to: POST /api/v1/checkout/create-session
 *
 * @property sessionId Stripe session ID
 * @property url Stripe payment URL
 * @property error Error message if failed
 */
data class CheckoutSessionResponse(
    @SerializedName("sessionId")
    val sessionId: String? = null,
    @SerializedName("url")
    val url: String? = null,
    @SerializedName("error")
    val error: String? = null
)

// Stripe payment status response
/**
 * Response from Stripe payment status check.
 *
 * Maps to: GET /api/v1/checkout/status/{orderId}
 *
 * @property status Payment status (paid, unpaid, canceled)
 * @property orderId Associated order ID
 * @property error Error message if failed
 */
data class PaymentStatusResponse(
    @SerializedName("status")
    val status: String? = null, // "paid", "unpaid", "canceled"
    @SerializedName("orderId")
    val orderId: String? = null,
    @SerializedName("error")
    val error: String? = null
)

// Review responses
/**
 * Response wrapper for reviews list.
 *
 * Maps to: GET /api/v1/products/{id}/reviews
 *
 * @property reviews List of ReviewDto items
 * @property averageRating Average rating score
 * @property totalCount Total number of reviews
 */
data class ReviewsResponse(
    @SerializedName("reviews")
    val reviews: List<ReviewDto>? = null,
    @SerializedName("average_rating")
    val averageRating: Double? = null,
    @SerializedName("total_count")
    val totalCount: Int? = null
)

/**
 * Response wrapper for single review operation.
 *
 * Maps to: POST /api/v1/products/{id}/reviews
 *
 * @property review Created review data
 * @property message Response message
 * @property error Error message if failed
 */
data class ReviewResponse(
    @SerializedName("review")
    val review: ReviewDto? = null,
    @SerializedName("message")
    val message: String? = null,
    @SerializedName("error")
    val error: String? = null
)

// Wishlist responses
/**
 * Response wrapper for wishlist endpoints.
 *
 * Maps to: GET /api/v1/wishlist
 *
 * @property wishlist List of wishlisted products
 * @property totalItems Total items count
 */
data class WishlistResponse(
    @SerializedName("wishlist")
    val wishlist: List<ProductDto>? = null,
    @SerializedName("total_items")
    val totalItems: Int? = null
)

// Promo code responses
/**
 * Response wrapper for promo codes list.
 *
 * Maps to: GET /api/v1/promo-codes
 *
 * @property promoCodes List of available promo codes
 */
data class PromoCodesResponse(
    @SerializedName("promo_codes")
    val promoCodes: List<PromoCodeDto>? = null
)

/**
 * Data Transfer Object for Promo Code.
 *
 * Maps to: GET /api/v1/promo-codes
 *
 * @property code Promo code string
 * @property discountType Type (percentage, fixed)
 * @property discountValue Discount amount
 * @property minOrderValue Minimum order value required
 * @property maxDiscount Maximum discount cap
 * @property expiresAt Expiration timestamp
 * @property description Promo description
 */
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

/**
 * Response from promo code validation.
 *
 * Maps to: POST /api/v1/cart/validate-promo
 *
 * @property valid Whether code is valid
 * @property discountAmount Calculated discount
 * @property message Response message
 * @property error Error message if invalid
 */
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

/**
 * Response from promo code application.
 *
 * Maps to: POST /api/v1/cart/apply-promo
 *
 * @property success Whether code was applied
 * @property discountAmount Discount applied
 * @property finalTotal Final total after discount
 * @property message Response message
 * @property error Error message if failed
 */
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

/**
 * Response from coupon application at checkout.
 *
 * Maps to: POST /api/v1/checkout/apply-coupon
 *
 * @property success Whether coupon applied
 * @property couponCode Applied code
 * @property discountType Type of discount
 * @property discountValue Discount amount
 * @property subtotal Subtotal before discount
 * @property discountAmount Discount applied
 * @property finalTotal Final total
 * @property description Coupon description
 * @property message Response message
 * @property error Error message if failed
 */
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
/**
 * Response wrapper for address list.
 *
 * Maps to: GET /api/v1/user/addresses
 *
 * @property addresses List of AddressDto items
 */
data class AddressListResponse(
    @SerializedName("addresses")
    val addresses: List<AddressDto>? = null
)

/**
 * Data Transfer Object for User Address.
 *
 * Maps to: GET /api/v1/user/addresses, POST /api/v1/user/addresses
 *
 * @property id Address ID
 * @property userId Associated user ID
 * @property name Address label/name
 * @property phone Contact phone
 * @property street Street address
 * @property city City
 * @property district District
 * @property ward Ward/Commune
 * @property isDefault Whether this is default address
 * @property label Address type label (Home, Work)
 */
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

/**
 * Request payload for AI voice assistant (for AI Worker).
 *
 * Maps to: POST /api/v1/ai/voice
 *
 * @property text Optional text input (for text-based queries)
 * @property audioBase64 Base64 encoded audio data
 * @property sessionId Current session identifier
 * @property context Additional context (user_id)
 */
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

/**
 * Context data for AI voice requests.
 *
 * @property userId Authenticated user ID (nullable for guest users)
 */
data class AiVoiceContext(
    @SerializedName("user_id")
    val userId: String? = null,
)

/**
 * Response from AI voice assistant (from AI Worker).
 *
 * Maps to: POST /api/v1/ai/voice
 *
 * @property transcribedText Transcribed user speech (if audio provided)
 * @property responseText AI response text
 * @property action JSON action to execute (add to cart, search, etc.)
 * @property searchResults Product search results (if applicable)
 * @property error Error message if failed
 */
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

/**
 * Product search result from AI voice assistant.
 *
 * @property id Product ID
 * @property name Product name
 * @property price Product price
 * @property brand Brand name
 * @property category Product category
 * @property index Result index for ordering
 */
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
