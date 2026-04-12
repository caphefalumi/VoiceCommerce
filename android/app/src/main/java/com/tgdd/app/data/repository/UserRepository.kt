package com.tgdd.app.data.repository

import com.tgdd.app.data.local.UserSession
import com.tgdd.app.data.local.dao.OrderDao
import com.tgdd.app.data.model.AuthUserDto
import com.tgdd.app.data.model.UserDto
import com.tgdd.app.data.network.NetworkObserver
import com.tgdd.app.data.remote.UserApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext
import javax.inject.Inject

/**
 * Repository for user authentication and profile management.
 * 
 * Data Source Strategy: Network-only (no caching)
 * 
 * ## Read Flow:
 * 1. All user data fetched from network
 * 2. Session stored in UserSession (SharedPreferences)
 * 3. No Room caching for user data
 * 
 * ## Write Flow:
 * 1. Auth operations (sign-in/up) hit network
 * 2. On success, credentials saved to UserSession
 * 3. On sign-out, clear local data (orders)
 * 
 * ## Caching Mechanism:
 * - [UserSession] for auth token and basic user info
 * - No Room cache for user data
 * - Network-only for user profile operations
 * 
 * @see UserApi For authentication endpoints
 * @see UserSession For token storage
 */
class UserRepository @Inject constructor(
    private val userApi: UserApi,
    private val userSession: UserSession,
    private val cartRepository: CartRepository,
    private val orderDao: OrderDao
) {
    /**
     * Fetches user profile by ID from network.
     * 
     * @param id User ID to fetch
     * @return Result containing user data
     * @throws Exception if offline or API error
     */
    suspend fun getUserById(id: String): Result<UserDto> = withContext(Dispatchers.IO) {
        if (!NetworkObserver.isCurrentlyConnected()) {
            return@withContext Result.failure(Exception("No internet connection"))
        }
        try {
            val response = userApi.getUserById(id)
            if (response.isSuccessful) {
                val user = response.body()?.user
                if (user != null) Result.success(user)
                else Result.failure(Exception("User not found"))
            } else {
                Result.failure(Exception("API error: ${response.code()} - ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Signs in with email/password credentials.
     * 
     * On success: saves auth token and user info to UserSession
     * 
     * @param email User email
     * @param password User password
     * @return Result containing authenticated user data
     */
    suspend fun signIn(email: String, password: String): Result<AuthUserDto> = withContext(Dispatchers.IO) {
        try {
            val response = userApi.signIn(mapOf("email" to email, "password" to password))
            if (response.isSuccessful) {
                val body = response.body()
                if (body?.error != null) return@withContext Result.failure(Exception(body.error))
                val user = body?.user
                val token = body?.token
                if (user != null) {
                    // Save auth credentials on successful login
                    if (!token.isNullOrBlank()) userSession.saveAuthToken(token)
                    userSession.saveUserInfo(user.name ?: user.email ?: "", user.email ?: "")
                    userSession.saveUserId(user.id)
                    Result.success(user)
                } else {
                    Result.failure(Exception("Invalid credentials"))
                }
            } else {
                Result.failure(Exception("Login failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Registers a new user account.
     * 
     * On success: saves auth token and user info to UserSession
     * 
     * @param name User display name
     * @param email User email
     * @param password User password
     * @return Result containing authenticated user data
     */
    suspend fun signUp(name: String, email: String, password: String): Result<AuthUserDto> = withContext(Dispatchers.IO) {
        try {
            val response = userApi.signUp(mapOf("name" to name, "email" to email, "password" to password))
            if (response.isSuccessful) {
                val body = response.body()
                if (body?.error != null) return@withContext Result.failure(Exception(body.error))
                val user = body?.user
                val token = body?.token
                if (user != null) {
                    // Save auth credentials on successful registration
                    if (!token.isNullOrBlank()) userSession.saveAuthToken(token)
                    userSession.saveUserInfo(user.name ?: user.email ?: "", user.email ?: "")
                    userSession.saveUserId(user.id)
                    Result.success(user)
                } else {
                    Result.failure(Exception("Registration failed"))
                }
            } else {
                Result.failure(Exception("Registration failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Signs out the current user.
     * 
     * Clears all local data: cart (via API), orders, and session.
     * Attempts server sign-out but ignores failures.
     */
    suspend fun signOut() = withContext(Dispatchers.IO) {
        // Attempt server logout (best-effort)
        try { userApi.signOut() } catch (_: Exception) {}
        // Clear all local user data
        cartRepository.clearCart()
        userSession.getUserId()?.let { userId ->
            try {
                val orders = orderDao.getOrdersByUserId(userId).first()
                orders.forEach { orderDao.deleteOrder(it) }
            } catch (_: Exception) {}
        }
        userSession.clearSession()
    }

    /**
     * Requests password reset email.
     * 
     * @param email User email for password reset
     * @return Result.success if email sent, failure otherwise
     */
    suspend fun forgotPassword(email: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val response = userApi.forgotPassword(mapOf("email" to email))
            if (response.isSuccessful) Result.success(Unit)
            else Result.failure(Exception("Failed: ${response.code()}"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Gets Google OAuth URL for sign-in via browser/Custom Tab.
     * 
     * @param callbackUrl OAuth callback URL (deep link)
     * @return Result containing OAuth authorization URL
     */
    suspend fun getGoogleSignInUrl(callbackUrl: String): Result<String> = withContext(Dispatchers.IO) {
        try {
            val response = userApi.getGoogleSignInUrl(callbackUrl)
            if (response.isSuccessful) {
                val url = response.body()?.url
                if (!url.isNullOrBlank()) Result.success(url)
                else Result.failure(Exception("No OAuth URL returned"))
            } else {
                Result.failure(Exception("Failed to get OAuth URL: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Exchanges OAuth code+state for Bearer token after browser callback.
     * 
     * Called from OAuthCallbackActivity via tgdd://oauth deep link.
     * On success: saves auth token and user info to UserSession
     * 
     * @param code OAuth authorization code
     * @param state OAuth state for CSRF protection
     * @return Result containing authenticated user data
     */
    suspend fun handleGoogleCallback(code: String, state: String): Result<AuthUserDto> = withContext(Dispatchers.IO) {
        try {
            val response = userApi.mobileGoogleCallback(code, state)
            if (response.isSuccessful) {
                val body = response.body()
                val user = body?.user
                val token = body?.token
                if (user != null && !token.isNullOrBlank()) {
                    userSession.saveAuthToken(token)
                    userSession.saveUserInfo(user.name ?: user.email ?: "", user.email ?: "")
                    userSession.saveUserId(user.id)
                    Result.success(user)
                } else {
                    Result.failure(Exception("OAuth succeeded but no token/user returned"))
                }
            } else {
                Result.failure(Exception("Callback failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Refreshes session after OAuth completion.
     * 
     * Reads session from cookie set by better-auth.
     * Updates UserSession with latest user info.
     * 
     * @return Result containing current user data
     */
    suspend fun refreshSession(): Result<AuthUserDto> = withContext(Dispatchers.IO) {
        try {
            val response = userApi.getSession()
            if (response.isSuccessful) {
                val user = response.body()?.user
                if (user != null) {
                    userSession.saveUserInfo(user.name ?: user.email ?: "", user.email ?: "")
                    userSession.saveUserId(user.id)
                    // Token may be null for cookie-based sessions — that's fine
                    response.body()?.token?.let { userSession.saveAuthToken(it) }
                    Result.success(user)
                } else {
                    Result.failure(Exception("No session"))
                }
            } else {
                Result.failure(Exception("No active session"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Updates the current user's display name.
     * 
     * @param name New display name
     * @return Result containing updated user data
     */
    suspend fun updateUser(name: String): Result<AuthUserDto> = withContext(Dispatchers.IO) {
        try {
            val response = userApi.updateUser(mapOf("name" to name))
            if (response.isSuccessful) {
                val user = response.body()?.user
                if (user != null) {
                    userSession.saveUserInfo(user.name ?: user.email ?: "", user.email ?: "")
                    Result.success(user)
                } else {
                    Result.failure(Exception("Update failed"))
                }
            } else {
                Result.failure(Exception("Update failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Resets password using token from email.
     * 
     * @param token Password reset token from email
     * @param newPassword New password to set
     * @return Result.success on successful reset
     */
    suspend fun resetPassword(token: String, newPassword: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val response = userApi.resetPassword(mapOf("token" to token, "newPassword" to newPassword))
            if (response.isSuccessful) Result.success(Unit)
            else Result.failure(Exception("Reset failed: ${response.code()}"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Verifies email with token from verification email.
     * 
     * @param token Email verification token from email
     * @return Result.success on successful verification
     */
    suspend fun verifyEmail(token: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val response = userApi.verifyEmail(token)
            if (response.isSuccessful) Result.success(Unit)
            else Result.failure(Exception("Verification failed: ${response.code()}"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Signs in with Firebase Google ID token.
     * 
     * Exchanges Firebase ID token for API Bearer token.
     * On success: saves auth token and user info to UserSession
     * 
     * @param firebaseIdToken Firebase Google ID token
     * @return Result containing authenticated user data
     */
    suspend fun signInWithFirebase(firebaseIdToken: String): Result<AuthUserDto> = withContext(Dispatchers.IO) {
        try {
            val response = userApi.firebaseSignIn(mapOf("idToken" to firebaseIdToken))
            if (response.isSuccessful) {
                val body = response.body()
                val user = body?.user
                val token = body?.token
                if (user != null && !token.isNullOrBlank()) {
                    userSession.saveAuthToken(token)
                    userSession.saveUserInfo(user.name ?: user.email ?: "", user.email ?: "")
                    userSession.saveUserId(user.id)
                    Result.success(user)
                } else {
                    Result.failure(Exception("Firebase auth succeeded but no token/user"))
                }
            } else {
                Result.failure(Exception("Firebase auth failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Signs in with Firebase email/password.
     * 
     * @param email User email
     * @param password User password
     * @return Result containing needsVerification flag
     */
    suspend fun signInWithFirebaseEmail(email: String, password: String): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val response = userApi.firebaseSignInEmail(mapOf("email" to email, "password" to password))
            if (response.isSuccessful) {
                val body = response.body()
                val user = body?.user
                val token = body?.token
                if (user != null && !token.isNullOrBlank()) {
                    userSession.saveAuthToken(token)
                    userSession.saveUserInfo(user.name ?: user.email ?: "", user.email ?: "")
                    userSession.saveUserId(user.id)
                    val needsVerification = body.needsVerification ?: false
                    Result.success(needsVerification)
                } else {
                    Result.failure(Exception("Firebase auth succeeded but no token/user"))
                }
            } else {
                Result.failure(Exception("Firebase auth failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Creates new account with Firebase email/password.
     * 
     * @param name User display name
     * @param email User email
     * @param password User password
     * @return Result.success on successful registration
     */
    suspend fun signUpWithFirebase(name: String, email: String, password: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val response = userApi.firebaseCreateAccount(mapOf("name" to name, "email" to email, "password" to password))
            if (response.isSuccessful) {
                val body = response.body()
                val user = body?.user
                val token = body?.token
                if (user != null && !token.isNullOrBlank()) {
                    userSession.saveAuthToken(token)
                    userSession.saveUserInfo(user.name ?: user.email ?: "", user.email ?: "")
                    userSession.saveUserId(user.id)
                    Result.success(Unit)
                } else {
                    Result.failure(Exception("Firebase sign up succeeded but no token/user"))
                }
            } else {
                Result.failure(Exception("Firebase sign up failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Sends password reset email via Firebase.
     * 
     * @param email User email for password reset
     * @return Result.success if email sent
     */
    suspend fun sendPasswordReset(email: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val response = userApi.firebaseResetPassword(mapOf("email" to email))
            if (response.isSuccessful) Result.success(Unit)
            else Result.failure(Exception("Password reset failed: ${response.code()}"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
