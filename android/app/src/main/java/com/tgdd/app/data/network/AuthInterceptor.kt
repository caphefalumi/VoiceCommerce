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
            val userSession = UserSession(context)
            userSession.clearSession()
            AuthEvents.postAuthError("Session expired. Please login again.")
            response.close()
        }
        
        return response
    }
}
