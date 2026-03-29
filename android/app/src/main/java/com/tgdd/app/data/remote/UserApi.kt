package com.tgdd.app.data.remote

import com.tgdd.app.data.model.AuthResponse
import com.tgdd.app.data.model.UserDto
import com.tgdd.app.data.model.UserResponse
import retrofit2.Response
import retrofit2.http.*

interface UserApi {
    @GET("users/{id}")
    suspend fun getUserById(@Path("id") id: String): Response<UserResponse>

    @POST("auth/sign-in/email")
    suspend fun signIn(@Body body: Map<String, String>): Response<AuthResponse>

    @POST("auth/sign-up/email")
    suspend fun signUp(@Body body: Map<String, String>): Response<AuthResponse>

    @POST("auth/sign-out")
    suspend fun signOut(): Response<Unit>

    @POST("auth/forget-password")
    suspend fun forgotPassword(@Body body: Map<String, String>): Response<Unit>
}
