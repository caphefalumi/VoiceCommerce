package com.tgdd.app.data.remote

import com.tgdd.app.data.model.TicketCreateResponse
import com.tgdd.app.data.model.TicketListResponse
import retrofit2.Response
import retrofit2.http.*

interface TicketApi {
    @POST("tickets")
    suspend fun createTicket(@Body ticket: Map<String, Any>): Response<TicketCreateResponse>

    @GET("tickets/{userId}")
    suspend fun getTickets(@Path("userId") userId: String): Response<TicketListResponse>
}
