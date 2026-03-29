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
}
