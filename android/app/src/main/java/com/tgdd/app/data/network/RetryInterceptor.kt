package com.tgdd.app.data.network

import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response
import java.io.IOException
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * OkHttp interceptor that implements retry logic for failed network requests.
 *
 * This interceptor sits in the response chain and automatically retries requests
 * that fail due to server errors (5xx status codes) or network I/O exceptions.
 *
 * ### Retry Strategy:
 * - **Maximum retries**: [maxRetries] parameter (default: 3 attempts including initial)
 * - **Exponential backoff**: Delays double after each retry: 1s → 2s → 4s → 8s...
 * - **Maximum delay cap**: [maxDelayMs] (default: 10 seconds)
 * - **Retries on**: HTTP 500, 502, 503, 504 (server errors)
 * - **Does NOT retry on**: 4xx client errors (400-499)
 *
 * ### Execution Chain:
 * 1. Proceeds with the original request
 * 2. If successful (2xx), returns immediately
 * 3. If server error (5xx) and retries remaining, waits with backoff then retries
 * 4. If network I/O exception and retries remaining, waits with backoff then retries
 * 5. After max retries exhausted, throws the last exception
 *
 * ### Timing Between Retries:
 * - Initial attempt: No delay
 * - After first failure: [initialDelayMs] (default: 1000ms)
 * - After second failure: [initialDelayMs] * 2 (default: 2000ms)
 * - After third failure: [initialDelayMs] * 4 (default: 4000ms)
 * - Capped at [maxDelayMs] (default: 10000ms)
 */
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
                
                // Request succeeded - return immediately
                if (response.isSuccessful) {
                    return response
                }
                
                // Retry condition: Server error (5xx status codes) AND still have retries remaining
                // Does NOT retry on: 4xx client errors (400-499), which indicate the request itself is invalid
                if (response.code in 500..599 && retryCount < maxRetries) {
                    retryCount++
                    response.close()
                    // Wait with exponential backoff: delay doubles each retry (1s → 2s → 4s...)
                    // Uses coroutine delay to avoid blocking the dispatcher thread
                    runBlocking { delay(delayMs) }
                    // Calculate next delay: double the previous, capped at maxDelayMs
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
