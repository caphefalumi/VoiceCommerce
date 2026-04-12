package com.tgdd.app.data.model

import com.google.gson.annotations.SerializedName

/**
 * Data Transfer Object for Product from API.
 *
 * Maps to: GET /api/v1/products
 *
 * Example JSON:
 * {
 *   "id": "prod_123",
 *   "name": "iPhone 15 Pro",
 *   "price": 999000.0,
 *   "originalPrice": 1099000.0,
 *   "images": ["https://example.com/iphone.jpg"],
 *   "category": "smartphone",
 *   "description": "Latest iPhone model",
 *   "rating": 4.8,
 *   "reviewCount": 256,
 *   "brand": "Apple",
 *   "stock": 50,
 *   "discountPercentage": 10,
 *   "isNew": false,
 *   "specs": {"storage": "256GB", "color": "Titanium"},
 *   "url": "https://example.com/product/prod_123",
 *   "createdAt": "2024-01-15T10:30:00Z"
 * }
 *
 * @property id Unique product identifier
 * @property name Product name
 * @property price Current price in VND
 * @property originalPrice Original price before discount (nullable)
 * @property images List of product image URLs
 * @property category Product category
 * @property description Product description
 * @property rating Average rating (0-5)
 * @property reviewCount Number of reviews
 * @property brand Brand name
 * @property stock Available stock quantity
 * @property discountPercentage Discount percentage
 * @property isNew Whether product is new
 * @property specs Key-value specifications
 * @property reviews List of reviews (included when fetching single product)
 * @property url Product detail URL
 * @property createdAt Creation timestamp
 *
 * @see Product For Room database entity
 */
data class ProductDto(
    @SerializedName("id")
    val id: String,
    @SerializedName("name")
    val name: String,
    @SerializedName("price")
    val price: Double,
    @SerializedName("originalPrice")
    val originalPrice: Double? = null,
    @SerializedName("images")
    val images: List<String>? = null,
    @SerializedName("category")
    val category: String,
    @SerializedName("description")
    val description: String? = null,
    @SerializedName("rating")
    val rating: Float = 0f,
    @SerializedName(value = "reviewCount", alternate = ["review_count"])
    val reviewCount: Int = 0,
    @SerializedName("brand")
    val brand: String? = null,
    @SerializedName("stock")
    val stock: Int = 1,
    @SerializedName("discountPercentage")
    val discountPercentage: Int = 0,
    @SerializedName("isNew")
    val isNew: Boolean = false,
    @SerializedName("specs")
    val specs: Map<String, String>? = null,
    @SerializedName("reviews")
    val reviews: List<ReviewDto>? = null,
    @SerializedName("url")
    val url: String? = null,
    @SerializedName("createdAt")
    val createdAt: String? = null
) {
    val inStock: Boolean
        get() = stock > 0

    fun getFirstImage(): String {
        return images?.firstOrNull() ?: ""
    }
}
