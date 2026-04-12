package com.tgdd.app.data.remote

import com.tgdd.app.data.model.AuthResponse
import com.tgdd.app.data.model.AiVoiceRequest
import com.tgdd.app.data.model.AiVoiceResponse
import com.tgdd.app.data.model.SocialSignInResponse
import com.tgdd.app.data.model.UserDto
import com.tgdd.app.data.model.UserResponse
import retrofit2.Response
import retrofit2.http.*

/**
 * Retrofit API interface for user authentication and profile operations.
 * Defines endpoints for sign-in, sign-up, OAuth, and user management.
 *
 * Base URL: https://api-worker.dangduytoan13l.workers.dev/api/
 * Most endpoints require: Bearer token authentication header
 */
interface UserApi {
    /**
     * Fetches a user by their unique identifier.
     * @param id The unique user ID
     * @return Response containing user details
     * @see UserResponse
     * @see UserDto
     */
    @GET("users/{id}")
    suspend fun getUserById(@Path("id") id: String): Response<UserResponse>

    /**
     * Signs in with email and password.
     * @param body Map containing credentials (email, password)
     * @return Response with authentication token and user info
     * @see AuthResponse
     */
    @POST("auth/sign-in/email")
    suspend fun signIn(@Body body: Map<String, String>): Response<AuthResponse>

    /**
     * Registers a new user with email and password.
     * @param body Map containing registration details (email, password, name)
     * @return Response with authentication token and user info
     * @see AuthResponse
     */
    @POST("auth/sign-up/email")
    suspend fun signUp(@Body body: Map<String, String>): Response<AuthResponse>

    /**
     * Signs out the current user.
     * @return Response with success status
     */
    @POST("auth/sign-out")
    suspend fun signOut(): Response<Unit>

    /**
     * Sends password reset email.
     * @param body Map containing user email (email)
     * @return Response with success status
     */
    @POST("auth/forget-password")
    suspend fun forgotPassword(@Body body: Map<String, String>): Response<Unit>

    /**
     * Mobile-safe Google OAuth URL endpoint — bypasses Better Auth's CSRF check.
     * @param callbackURL The URL to redirect after OAuth completion
     * @return Response with Google sign-in URL
     * @see SocialSignInResponse
     */
    @GET("mobile/google-url")
    suspend fun getGoogleSignInUrl(
        @Query("callbackURL") callbackURL: String
    ): Response<SocialSignInResponse>

    /**
     * Exchange the OAuth code+state (from the tgdd://oauth deep link) for a
     * Bearer token via the mobile callback helper endpoint.
     * @param code OAuth authorization code
     * @param state OAuth state parameter
     * @return Response with authentication token and user info
     * @see AuthResponse
     */
    @GET("mobile/google-callback")
    suspend fun mobileGoogleCallback(
        @Query("code") code: String,
        @Query("state") state: String
    ): Response<AuthResponse>

    /**
     * Get the current session (used after OAuth to retrieve user info).
     * @return Response with current session and user info
     * @see AuthResponse
     */
    @GET("auth/get-session")
    suspend fun getSession(): Response<AuthResponse>

    /**
     * Update user name (calls /api/auth/user PATCH).
     * @param body Map containing user details to update (name)
     * @return Response with updated user info
     * @see AuthResponse
     */
    @PATCH("auth/user")
    suspend fun updateUser(@Body body: Map<String, String>): Response<AuthResponse>

    /**
     * Reset password with token (calls /api/auth/reset-password POST).
     * @param body Map containing reset details (newPassword, token)
     * @return Response with success status
     */
    @POST("auth/reset-password")
    suspend fun resetPassword(@Body body: Map<String, String>): Response<Unit>

    /**
     * Verify email with token (calls /api/auth/verify-email GET with query param).
     * @param token Email verification token
     * @return Response with success status
     */
    @GET("auth/verify-email")
    suspend fun verifyEmail(@Query("token") token: String): Response<Unit>

    /**
     * Firebase sign-in — sends Firebase ID token to API, receives Bearer token.
     * @param body Map containing Firebase ID token (idToken)
     * @return Response with authentication token and user info
     * @see AuthResponse
     */
    @POST("auth/firebase")
    suspend fun firebaseSignIn(@Body body: Map<String, String>): Response<AuthResponse>

    /**
     * Signs in with Firebase email/password.
     * @param body Map containing credentials (email, password)
     * @return Response with authentication token and user info
     * @see AuthResponse
     */
    @POST("auth/firebase/email")
    suspend fun firebaseSignInEmail(@Body body: Map<String, String>): Response<AuthResponse>

    /**
     * Signs up with Firebase email/password.
     * @param body Map containing registration details (email, password, name)
     * @return Response with authentication token and user info
     * @see AuthResponse
     */
    @POST("auth/firebase/email/signup")
    suspend fun firebaseSignUpEmail(@Body body: Map<String, String>): Response<AuthResponse>

    /**
     * Resets password using Firebase.
     * @param body Map containing reset details (email)
     * @return Response with success status
     */
    @POST("auth/firebase/reset-password")
    suspend fun firebaseResetPassword(@Body body: Map<String, String>): Response<Unit>

    /**
     * Creates an account using Firebase.
     * @param body Map containing account details (email, password, name)
     * @return Response with authentication token and user info
     * @see AuthResponse
     */
    @POST("auth/firebase/create-account")
    suspend fun firebaseCreateAccount(@Body body: Map<String, String>): Response<AuthResponse>
}