package com.tgdd.app.data.model

import com.google.gson.annotations.SerializedName

/**
 * Data Transfer Object for User from API.
 *
 * Maps to: GET /api/v1/user/me
 *
 * Example JSON:
 * {
 *   "id": "user_123",
 *   "email": "user@example.com",
 *   "username": "johndoe",
 *   "created_at": "2024-01-15T10:30:00Z"
 * }
 *
 * @property id User unique identifier
 * @property email User email address
 * @property username User display name
 * @property createdAt Account creation timestamp
 */
data class UserDto(
    @SerializedName("id")
    val id: String,
    @SerializedName("email")
    val email: String?,
    @SerializedName("username")
    val username: String?,
    @SerializedName("created_at")
    val createdAt: String?
)

/**
 * Authentication response from login/register API.
 *
 * Maps to: POST /api/v1/auth/login, POST /api/v1/auth/register
 *
 * Example JSON:
 * {
 *   "token": "eyJhbGciOiJIUzI1NiIs...",
 *   "user": {"id": "user_123", "email": "user@example.com", "name": "John", "role": "user"},
 *   "needsVerification": false
 * }
 *
 * @property token JWT authentication token
 * @property user Authenticated user data
 * @property error Error message if authentication failed
 * @property message Success/error message
 * @property needsVerification Whether email verification is required
 */
data class AuthResponse(
    @SerializedName("token")
    val token: String? = null,
    @SerializedName("user")
    val user: AuthUserDto? = null,
    @SerializedName("error")
    val error: String? = null,
    @SerializedName("message")
    val message: String? = null,
    @SerializedName("needsVerification")
    val needsVerification: Boolean? = null
)

/**
 * Simplified user data for auth responses.
 *
 * @property id User ID
 * @property email User email
 * @property name Display name
 * @property role User role (user, admin)
 */
data class AuthUserDto(
    @SerializedName("id")
    val id: String,
    @SerializedName("email")
    val email: String?,
    @SerializedName("name")
    val name: String?,
    @SerializedName("role")
    val role: String? = "user"
)

/**
 * Response for social sign-in (OAuth) initiation.
 *
 * Maps to: GET /api/v1/auth/signin/{provider}
 *
 * Example JSON:
 * {
 *   "url": "https://provider.com/auth?redirect_uri=...",
 *   "redirect": true
 * }
 *
 * @property url OAuth authorization URL
 * @property redirect Whether to auto-redirect
 * @property error Error message if failed
 */
data class SocialSignInResponse(
    @SerializedName("url")
    val url: String? = null,
    @SerializedName("redirect")
    val redirect: Boolean? = null,
    @SerializedName("error")
    val error: String? = null
)
