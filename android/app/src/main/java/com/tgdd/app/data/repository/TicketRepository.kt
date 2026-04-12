package com.tgdd.app.data.repository

import android.util.Log
import com.tgdd.app.data.model.TicketCreateRequest
import com.tgdd.app.data.network.NetworkObserver
import com.tgdd.app.data.remote.TicketApi
import javax.inject.Inject

/**
 * Repository for support ticket management.
 * 
 * Data Source Strategy: Network-only
 * 
 * ## Read Flow:
 * 1. No local caching
 * 2. All operations hit the network
 * 3. Requires internet connection
 * 
 * ## Write Flow:
 * 1. Create tickets via API only
 * 2. No offline support for tickets
 * 3. Returns confirmation text on success
 * 
 * ## Caching Mechanism:
 * - No caching
 * - Network-only for support tickets
 * 
 * @see TicketApi For ticket creation endpoints
 */
class TicketRepository @Inject constructor(
    private val ticketApi: TicketApi
) {
    /**
     * Creates a new support ticket.
     * 
     * Requires network connection - no offline support.
     * 
     * @param userId User ID (optional)
     * @param category Ticket category (e.g., "order", "product", "technical")
     * @param message Ticket message content
     * @return Result containing confirmation text
     * @throws Exception if offline or API error
     */
    suspend fun createTicket(
        userId: String?,
        category: String,
        message: String
    ): Result<String> {
        // Check network connectivity
        if (!NetworkObserver.isCurrentlyConnected()) {
            return Result.failure(Exception("No internet connection"))
        }
        return try {
            val request = TicketCreateRequest(
                userId = userId ?: "",
                category = category,
                message = message
            )
            val response = ticketApi.createTicket(request)
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
