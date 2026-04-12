package com.tgdd.app.data.model

data class VoiceMessage(
    val role: String, // "user" or "assistant"
    val text: String,
    val timestamp: Long = System.currentTimeMillis()
)

data class VoiceRequest(
    val audio_base64: String,
    val session_id: String,
    val user_id: String?,
    val history: List<VoiceMessage>
)

data class VoiceResponse(
    val text: String,
    val audio_base64: String?,
    val intent: String?,
    val navigate_to: String? // "checkout" or null
)
