package com.tgdd.app.data.network

import android.content.Context
import com.tgdd.app.data.local.UserSession
import okhttp3.Interceptor
import okhttp3.Response

/**
 * OkHttp interceptor that handles authentication errors from the API.
 *
 * This interceptor sits in the response chain and monitors responses for authentication
 * failures (HTTP 401 Unauthorized).
 *
 * ### Behavior:
 * - Monitors EVERY response for 401 status code (doesn't modify requests)
 * - On 401 detected: Clears local session and posts auth error event
 * - Does NOT retry the request (unlike RetryInterceptor)
 *
 * ### Session Expiry Flow:
 * 1. API returns 401 → Token expired/invalid
 * 2. Interceptor detects 401
 * 3. Clears user session from local storage
 * 4. Posts auth error via AuthEvents (UI displays login prompt)
 * 5. Returns original 401 response to caller
 *
 * ### Chain Position:
 * - Executes AFTER the actual network call (response chain)
 * - Typically placed BEFORE RetryInterceptor in the chain
 * - Reads response only, doesn't add headers to requests
 */
class AuthInterceptor(private val context: Context) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val response = chain.proceed(request)
        
        if (response.code == 401) {
            // Close the response body FIRST to free resources
            response.close()
            // Then clear session and notify
            val userSession = UserSession(context)
            userSession.clearSession()
            AuthEvents.postAuthError("Session expired. Please login again.")
        }
        
        return response
    }
}
