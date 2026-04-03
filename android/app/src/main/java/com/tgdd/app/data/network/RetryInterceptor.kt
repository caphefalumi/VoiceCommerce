package com.tgdd.app.data.network

import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response
import java.io.IOException
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

class RetryInterceptor(
    private val maxRetries: Int = 3,
    private val initialDelayMs: Long = 1000,
    private val maxDelayMs: Long = 10000
) : Interceptor {
    
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        var response: Response? = null
        var lastException: IOException? = null
        
        var retryCount = 0
        var delayMs = initialDelayMs
        
        while (retryCount <= maxRetries) {
            try {
                response?.close()
                response = chain.proceed(request)
                
                if (response.isSuccessful) {
                    return response
                }
                
                // Retry on server errors (5xx)
                if (response.code in 500..599 && retryCount < maxRetries) {
                    retryCount++
                    response.close()
                    // Use dispatcher's delay instead of Thread.sleep
                    runBlocking { delay(delayMs) }
                    delayMs = (delayMs * 2).coerceAtMost(maxDelayMs)
                    continue
                }
                
                return response
                
            } catch (e: IOException) {
                lastException = e
                if (retryCount < maxRetries) {
                    retryCount++
                    runBlocking { delay(delayMs) }
                    delayMs = (delayMs * 2).coerceAtMost(maxDelayMs)
                } else {
                    throw e
                }
            } catch (e: Exception) {
                throw e
            }
        }
        
        throw lastException ?: IOException("Unknown error after $maxRetries retries")
    }
}
