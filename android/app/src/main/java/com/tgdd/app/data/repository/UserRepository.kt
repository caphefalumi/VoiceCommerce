package com.tgdd.app.data.repository

import com.tgdd.app.data.local.UserSession
import com.tgdd.app.data.model.AuthUserDto
import com.tgdd.app.data.model.UserDto
import com.tgdd.app.data.network.NetworkObserver
import com.tgdd.app.data.remote.UserApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject

class UserRepository @Inject constructor(
    private val userApi: UserApi,
    private val userSession: UserSession
) {
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

    suspend fun signIn(email: String, password: String): Result<AuthUserDto> = withContext(Dispatchers.IO) {
        try {
            val response = userApi.signIn(mapOf("email" to email, "password" to password))
            if (response.isSuccessful) {
                val body = response.body()
                if (body?.error != null) return@withContext Result.failure(Exception(body.error))
                val user = body?.user
                val token = body?.token
                if (user != null) {
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

    suspend fun signUp(name: String, email: String, password: String): Result<AuthUserDto> = withContext(Dispatchers.IO) {
        try {
            val response = userApi.signUp(mapOf("name" to name, "email" to email, "password" to password))
            if (response.isSuccessful) {
                val body = response.body()
                if (body?.error != null) return@withContext Result.failure(Exception(body.error))
                val user = body?.user
                val token = body?.token
                if (user != null) {
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

    suspend fun signOut() = withContext(Dispatchers.IO) {
        try { userApi.signOut() } catch (_: Exception) {}
        userSession.clearSession()
    }

    suspend fun forgotPassword(email: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val response = userApi.forgotPassword(mapOf("email" to email))
            if (response.isSuccessful) Result.success(Unit)
            else Result.failure(Exception("Failed: ${response.code()}"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /** Returns the Google OAuth URL to open in a browser/Custom Tab */
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
     * Exchange the OAuth code+state from the tgdd://oauth deep-link for a
     * Bearer token. Called from OAuthCallbackActivity.
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

    /** Fetch the current session after OAuth completes (reads cookie set by better-auth) */
    suspend fun refreshSession(): Result<AuthUserDto> = withContext(Dispatchers.IO) {
        try {
            val response = userApi.getSession()
            if (response.isSuccessful) {
                val user = response.body()?.user
                if (user != null) {
                    userSession.saveUserInfo(user.name ?: user.email ?: "", user.email ?: "")
                    userSession.saveUserId(user.id)
                    // token may be null for cookie-based sessions — that's fine
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

    /** Update the current user's name */
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

    /** Reset password with token received via email */
    suspend fun resetPassword(token: String, newPassword: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val response = userApi.resetPassword(mapOf("token" to token, "newPassword" to newPassword))
            if (response.isSuccessful) Result.success(Unit)
            else Result.failure(Exception("Reset failed: ${response.code()}"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /** Verify email with token received via email */
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
     * Sign in with Firebase Google — get ID token from Firebase,
     * send to API, receive Bearer token and user info.
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
