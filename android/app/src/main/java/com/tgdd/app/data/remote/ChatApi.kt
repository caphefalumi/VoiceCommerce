package com.tgdd.app.data.remote

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

data class ChatRequest(
    val text: String,
    val user_id: String?,
    val history: List<Map<String, String>>
)

data class ChatResponse(
    val response_text: String,
    val intent: String?,
    val tool_results: List<Any>?
)

interface ChatApi {
    @POST("chat")
    suspend fun sendChatMessage(
        @Body request: ChatRequest
    ): Response<ChatResponse>
}
