package com.tgdd.app.data.remote

import com.tgdd.app.data.model.AuthResponse
import com.tgdd.app.data.model.SocialSignInResponse
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

    /**
     * Mobile-safe Google OAuth URL endpoint — bypasses Better Auth's CSRF check.
     * Returns { url: "https://accounts.google.com/..." }
     */
    @GET("mobile/google-url")
    suspend fun getGoogleSignInUrl(
        @Query("callbackURL") callbackURL: String
    ): Response<SocialSignInResponse>

    /**
     * Exchange the OAuth code+state (from the tgdd://oauth deep link) for a
     * Bearer token via the mobile callback helper endpoint.
     * Returns { token: "...", user: { id, email, name } }
     */
    @GET("mobile/google-callback")
    suspend fun mobileGoogleCallback(
        @Query("code") code: String,
        @Query("state") state: String
    ): Response<AuthResponse>

    /** Get the current session (used after OAuth to retrieve user info) */
    @GET("auth/get-session")
    suspend fun getSession(): Response<AuthResponse>

    /** Update user name (calls /api/auth/user PATCH) */
    @PATCH("auth/user")
    suspend fun updateUser(@Body body: Map<String, String>): Response<AuthResponse>

    /** Reset password with token (calls /api/auth/reset-password POST) */
    @POST("auth/reset-password")
    suspend fun resetPassword(@Body body: Map<String, String>): Response<Unit>

    /** Verify email with token (calls /api/auth/verify-email GET with query param) */
    @GET("auth/verify-email")
    suspend fun verifyEmail(@Query("token") token: String): Response<Unit>

    /**
     * Firebase sign-in — sends Firebase ID token to API, receives Bearer token.
     * Body: { idToken: string }
     * Returns: { token: "...", user: {...} }
     */
    @POST("auth/firebase")
    suspend fun firebaseSignIn(@Body body: Map<String, String>): Response<AuthResponse>

    @POST("auth/firebase/email")
    suspend fun firebaseSignInEmail(@Body body: Map<String, String>): Response<AuthResponse>

    @POST("auth/firebase/email/signup")
    suspend fun firebaseSignUpEmail(@Body body: Map<String, String>): Response<AuthResponse>

    @POST("auth/firebase/reset-password")
    suspend fun firebaseResetPassword(@Body body: Map<String, String>): Response<Unit>

    @POST("auth/firebase/create-account")
    suspend fun firebaseCreateAccount(@Body body: Map<String, String>): Response<AuthResponse>
}
