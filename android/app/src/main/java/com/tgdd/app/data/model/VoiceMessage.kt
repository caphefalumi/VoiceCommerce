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
 * @property audio_base64 Base64 encoded audio input (optional, for audio-based requests)
 * @property text Text input (optional, for text-based requests)
 * @property session_id Current session identifier
 * @property user_id Authenticated user ID (nullable for guest)
 * @property history Previous conversation messages
 */
data class VoiceRequest(
    val audio_base64: String? = null,
    val text: String? = null,
    val session_id: String,
    val user_id: String?,
    val history: List<VoiceMessage> = emptyList(),
    val response_format: String? = null,
    val context: VoiceContext? = null
)

data class VoiceContext(
    val last_search_results: List<SearchResult>? = null
)

data class SearchResult(
    val id: String,
    val name: String,
    val price: Double,
    val index: Int
)

data class VoiceTtsRequest(
    val text: String,
    val response_format: String = "binary"
)

/**
 * Response from AI voice assistant API.
 *
 * @property transcribed_text The transcribed user speech (what the user said)
 * @property text Text response from AI
 * @property audio_base64 Base64 encoded audio response (optional)
 * @property intent Detected user intent
 * @property navigate_to Navigation target ("checkout" or null)
 */
data class VoiceResponse(
    val transcribed_text: String? = null,
    val text: String,
    val audio_base64: String?,
    val intent: String?,
    val navigate_to: String? // "checkout" or null
)
