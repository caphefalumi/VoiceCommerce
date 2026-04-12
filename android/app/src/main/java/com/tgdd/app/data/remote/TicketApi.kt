package com.tgdd.app.data.remote

import com.tgdd.app.data.model.TicketCreateResponse
import com.tgdd.app.data.model.TicketListResponse
import retrofit2.Response
import retrofit2.http.*

/**
 * Retrofit API interface for support ticket operations.
 * Defines endpoints for creating and retrieving support tickets.
 *
 * Base URL: https://api-worker.dangduytoan13l.workers.dev/api/
 * Requires: Bearer token authentication header
 */
interface TicketApi {
    /**
     * Creates a new support ticket.
     * @param ticket Map containing ticket details (subject, description, priority)
     * @return Response with created ticket confirmation
     * @see TicketCreateResponse
     */
    @POST("tickets")
    suspend fun createTicket(@Body ticket: Map<String, Any>): Response<TicketCreateResponse>

    /**
     * Fetches all tickets for a specific user.
     * @param userId The user ID to get tickets for
     * @return Response containing list of user's tickets
     * @see TicketListResponse
     */
    @GET("tickets/{userId}")
    suspend fun getTickets(@Path("userId") userId: String): Response<TicketListResponse>
}