package com.tgdd.app.data.model

import com.google.gson.annotations.SerializedName

/**
 * Data Transfer Object for Product Review from API.
 *
 * Maps to: GET /api/v1/products/{id}/reviews
 *
 * Example JSON:
 * {
 *   "id": "review_123",
 *   "product_id": "prod_456",
 *   "user_id": "user_789",
 *   "user_name": "John Doe",
 *   "rating": 5,
 *   "comment": "Great product! Highly recommended.",
 *   "images": ["https://example.com/review1.jpg"],
 *   "helpful_count": 42,
 *   "created_at": "2024-01-15T10:30:00Z",
 *   "verified_purchase": true
 * }
 *
 * @property id Review unique ID
 * @property productId Associated product ID
 * @property userId Reviewer user ID
 * @property userName Reviewer display name
 * @property rating Rating (1-5 stars)
 * @property comment Review text
 * @property images Optional review images
 * @property helpfulCount Number of users who found this helpful
 * @property createdAt Review creation timestamp
 * @property isVerifiedPurchase Whether reviewer purchased the product
 */
data class ReviewDto(
    @SerializedName("id")
    val id: String?,
    @SerializedName("product_id")
    val productId: String?,
    @SerializedName("user_id")
    val userId: String?,
    @SerializedName("user_name")
    val userName: String?,
    @SerializedName("rating")
    val rating: Int,
    @SerializedName("comment")
    val comment: String?,
    @SerializedName("images")
    val images: List<String>? = null,
    @SerializedName("helpful_count")
    val helpfulCount: Int = 0,
    @SerializedName("created_at")
    val createdAt: String? = null,
    @SerializedName("verified_purchase")
    val isVerifiedPurchase: Boolean = false
)
