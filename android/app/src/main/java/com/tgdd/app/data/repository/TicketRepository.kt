package com.tgdd.app.data.repository

import android.util.Log
import com.tgdd.app.data.network.NetworkObserver
import com.tgdd.app.data.remote.TicketApi
import javax.inject.Inject

class TicketRepository @Inject constructor(
    private val ticketApi: TicketApi
) {
    suspend fun createTicket(
        userId: String?,
        category: String,
        message: String
    ): Result<String> {
        if (!NetworkObserver.isCurrentlyConnected()) {
            return Result.failure(Exception("No internet connection"))
        }
        return try {
            val requestBody = mapOf(
                "user_id" to (userId ?: ""),
                "category" to category,
                "message" to message
            )
            val response = ticketApi.createTicket(requestBody)
            if (response.isSuccessful) {
                val responseBody = response.body()
                if (responseBody?.error != null) {
                    Result.failure(Exception(responseBody.error))
                } else {
                    Result.success(responseBody?.confirmationText ?: "Yêu cầu đã được gửi")
                }
            } else {
                Result.failure(Exception("Lỗi: ${response.code()}"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Create ticket failed: ${e.message}", e)
            Result.failure(e)
        }
    }

    companion object {
        private const val TAG = "TicketRepository"
    }
}
