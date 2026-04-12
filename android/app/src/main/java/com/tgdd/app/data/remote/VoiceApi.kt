package com.tgdd.app.data.remote

import com.tgdd.app.data.model.VoiceRequest
import com.tgdd.app.data.model.VoiceResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

interface VoiceApi {
    @POST("voice/process")
    suspend fun processVoice(@Body request: VoiceRequest): Response<VoiceResponse>
}
