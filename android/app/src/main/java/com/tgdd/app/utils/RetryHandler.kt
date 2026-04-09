package com.tgdd.app.utils

import kotlinx.coroutines.delay
import kotlin.math.pow

object RetryHandler {
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
                if (attempt == maxRetries - 1) {
                    return Result.failure(e)
                }
                delay(currentDelay)
                currentDelay = (currentDelay * factor).toLong().coerceAtMost(maxDelayMs)
            }
        }
        return Result.failure(Exception("Max retries exceeded"))
    }

    suspend fun <T> retryOnNetworkError(
        maxRetries: Int = 3,
        delayMs: Long = 2000,
        block: suspend () -> T
    ): Result<T> {
        repeat(maxRetries) { attempt ->
            try {
                return Result.success(block())
            } catch (e: Exception) {
                if (attempt == maxRetries - 1) {
                    return Result.failure(e)
                }
                if (isNetworkError(e)) {
                    delay(delayMs)
                } else {
                    return Result.failure(e)
                }
            }
        }
        return Result.failure(Exception("Max retries exceeded"))
    }

    private fun isNetworkError(exception: Exception): Boolean {
        val message = exception.message?.lowercase() ?: ""
        return message.contains("network") ||
                message.contains("timeout") ||
                message.contains("connection") ||
                message.contains("unreachable")
    }
}
