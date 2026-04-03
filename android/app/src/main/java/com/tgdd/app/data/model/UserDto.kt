package com.tgdd.app.data.model

import com.google.gson.annotations.SerializedName

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

data class AuthResponse(
    @SerializedName("token")
    val token: String? = null,
    @SerializedName("user")
    val user: AuthUserDto? = null,
    @SerializedName("error")
    val error: String? = null,
    @SerializedName("message")
    val message: String? = null
)

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

data class SocialSignInResponse(
    @SerializedName("url")
    val url: String? = null,
    @SerializedName("redirect")
    val redirect: Boolean? = null,
    @SerializedName("error")
    val error: String? = null
)
