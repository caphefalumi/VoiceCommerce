package com.tgdd.app.utils

import kotlinx.coroutines.delay
import kotlin.math.pow

/**
 * Utility object for handling retry logic with exponential backoff.
 * Provides retry mechanisms for network operations.
 */
object RetryHandler {
    
    /**
     * Executes a block with exponential backoff retry strategy.
     * 
     * @param maxRetries Maximum number of retry attempts (default 3)
     * @param initialDelayMs Initial delay in milliseconds (default 1000)
     * @param maxDelayMs Maximum delay cap in milliseconds (default 10000)
     * @param factor Exponential multiplier (default 2.0)
     * @param block Suspend function to execute
     * @return Result containing success value or final exception
     * 
     * @example
     * ```
     * val result = retryWithExponentialBackoff {
     *     api.fetchData()
     * }
     * result.onSuccess { data -> handle(data) }
     * result.onFailure { error -> showError(error) }
     * ```
     * 
     * Delay progression: 1000 -> 2000 -> 4000 -> 8000 (with factor 2.0)
     * 
     * Edge cases:
     * - Returns success on first attempt if no exception
     * - Returns failure if all retries exhausted
     * - Delay caps at maxDelayMs to prevent excessive waits
     */
    suspend fun <T> retryWithExponentialBackoff(
        maxRetries: Int = 3,
        initialDelayMs: Long = 1000,
        maxDelayMs: Long = 10000,
        factor: Double = 2.0,
        block: suspend () -> T
    ): Result<T> {
        var currentDelay = initialDelayMs
        repeat(maxRetries) { attempt ->
            try {
                return Result.success(block())
            } catch (e: Exception) {
                // Last attempt failed - return failure
                if (attempt == maxRetries - 1) {
                    return Result.failure(e)
                }
                // Wait before next attempt
                delay(currentDelay)
                // Calculate next delay with exponential backoff
                currentDelay = (currentDelay * factor).toLong().coerceAtMost(maxDelayMs)
            }
        }
        return Result.failure(Exception("Max retries exceeded"))
    }

    /**
     * Retries only on network errors with fixed delay.
     * Non-network errors fail immediately without retry.
     * 
     * @param maxRetries Maximum retry attempts (default 3)
     * @param delayMs Fixed delay between retries (default 2000)
     * @param block Suspend function to execute
     * @return Result containing success value or final exception
     * 
     * @example
     * ```
     * val result = retryOnNetworkError {
     *     api.fetchProducts()
     * }
     * ```
     * 
     * Network error keywords: "network", "timeout", "connection", "unreachable"
     * Non-network errors propagate immediately without retry.
     */
    suspend fun <T> retryOnNetworkError(
        maxRetries: Int = 3,
        delayMs: Long = 2000,
        block: suspend () -> T
    ): Result<T> {
        repeat(maxRetries) { attempt ->
            try {
                return Result.success(block())
            } catch (e: Exception) {
                // Last attempt failed
                if (attempt == maxRetries - 1) {
                    return Result.failure(e)
                }
                // Only retry on network errors
                if (isNetworkError(e)) {
                    delay(delayMs)
                } else {
                    // Non-network error - fail immediately
                    return Result.failure(e)
                }
            }
        }
        return Result.failure(Exception("Max retries exceeded"))
    }

    /**
     * Determines if exception is network-related.
     * 
     * Checks exception message for network-related keywords:
     * - "network"
     * - "timeout" 
     * - "connection"
     * - "unreachable"
     */
    private fun isNetworkError(exception: Exception): Boolean {
        val message = exception.message?.lowercase() ?: ""
        return message.contains("network") ||
                message.contains("timeout") ||
                message.contains("connection") ||
                message.contains("unreachable")
    }
}