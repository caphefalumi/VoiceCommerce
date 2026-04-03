package com.tgdd.app.data.network

import android.content.Context
import com.tgdd.app.data.local.UserSession
import okhttp3.Interceptor
import okhttp3.Response

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
