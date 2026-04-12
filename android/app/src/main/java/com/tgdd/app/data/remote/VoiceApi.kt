package com.tgdd.app.data.remote

import com.tgdd.app.data.model.VoiceRequest
import com.tgdd.app.data.model.VoiceResponse
import com.tgdd.app.data.model.VoiceTtsRequest
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.Headers
import retrofit2.http.POST

/**
 * Retrofit API interface for voice commerce operations.
 * Defines endpoints for processing voice commands and queries.
 *
 * Base URL: https://ai-worker.dangduytoan13l.workers.dev/
 * Requires: Bearer token authentication header
 */
interface VoiceApi {
    /**
     * Processes voice input (audio or text) and returns AI response.
     * @param request Voice request containing audio/text and session context
     * @return Response with AI processing result and actions
     * @see VoiceRequest
     * @see VoiceResponse
     */
    @POST("voice/process")
    suspend fun processVoice(@Body request: VoiceRequest): Response<VoiceResponse>

    @Headers("Accept: audio/mpeg")
    @POST("tts")
    suspend fun synthesizeSpeechBinary(@Body request: VoiceTtsRequest): Response<ResponseBody>
}
