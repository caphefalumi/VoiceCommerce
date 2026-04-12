package com.tgdd.app.data.network

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData

/**
 * Event bus for authentication-related events across the app.
 *
 * This singleton object allows network interceptors to communicate auth errors
 * to UI components via LiveData observation.
 *
 * ### Event Types:
 * - Auth Error: Posted when 401 detected by AuthInterceptor
 *
 * ### Usage in Interceptors:
 * ```
 * AuthEvents.postAuthError("Session expired. Please login again.")
 * ```
 *
 * ### Usage in UI:
 * ```
 * AuthEvents.authError?.observe(viewOwner) { errorMessage ->
 *     errorMessage?.let {
 *         showLoginPrompt(it)
 *         AuthEvents.clearAuthError()
 *     }
 * }
 * ```
 *
 * ### Flow:
 * 1. API returns 401
 * 2. AuthInterceptor detects and calls postAuthError()
 * 3. UI observes authError LiveData
 * 4. UI shows error dialog / redirects to login
 * 5. UI calls clearAuthError() to reset
 */
object AuthEvents {
    private val _authError = MutableLiveData<String?>()
    val authError: LiveData<String?> = _authError
    
    fun postAuthError(message: String) {
        _authError.postValue(message)
    }
    
    fun clearAuthError() {
        _authError.value = null
    }
}
