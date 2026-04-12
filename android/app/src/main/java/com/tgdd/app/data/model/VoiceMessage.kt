package com.tgdd.app.data.model

/**
 * Represents a voice message in local conversation history.
 * Used for maintaining AI voice assistant chat context.
 *
 * @property role Message sender ("user" or "assistant")
 * @property text Message content
 * @property timestamp Unix timestamp in milliseconds
 */
data class VoiceMessage(
    val role: String, // "user" or "assistant"
    val text: String,
    val timestamp: Long = System.currentTimeMillis()
)

/**
 * Request payload for AI voice assistant API.
 *
 * @property audio_base64 Base64 encoded audio input
 * @property session_id Current session identifier
 * @property user_id Authenticated user ID (nullable for guest)
 * @property history Previous conversation messages
 */
data class VoiceRequest(
    val audio_base64: String,
    val session_id: String,
    val user_id: String?,
    val history: List<VoiceMessage>
)

/**
 * Response from AI voice assistant API.
 *
 * @property text Text response from AI
 * @property audio_base64 Base64 encoded audio response (optional)
 * @property intent Detected user intent
 * @property navigate_to Navigation target ("checkout" or null)
 */
data class VoiceResponse(
    val text: String,
    val audio_base64: String?,
    val intent: String?,
    val navigate_to: String? // "checkout" or null
)
