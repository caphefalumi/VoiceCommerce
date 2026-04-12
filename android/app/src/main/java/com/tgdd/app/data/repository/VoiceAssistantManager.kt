package com.tgdd.app.data.repository

import android.content.Context
import com.tgdd.app.data.model.VoiceMessage
import com.tgdd.app.data.model.VoiceRequest
import com.tgdd.app.data.model.VoiceResponse
import com.tgdd.app.data.model.VoiceTtsRequest
import com.tgdd.app.data.remote.VoiceApi
import com.tgdd.app.util.AudioPlayer
import com.tgdd.app.util.VoiceRecorder
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class VoiceAssistantManager @Inject constructor(
    private val voiceApi: VoiceApi,
    @ApplicationContext private val context: Context
) {
    private val voiceRecorder = VoiceRecorder(context)
    private val audioPlayer = AudioPlayer(context)
    
    // In-memory chat history
    private val chatHistory = mutableListOf<VoiceMessage>()
    private var sessionId: String = UUID.randomUUID().toString()
    
    fun getSessionId(): String = sessionId
    
    fun getChatHistory(): List<VoiceMessage> = chatHistory.toList()
    
    fun clearHistory() {
        chatHistory.clear()
        sessionId = UUID.randomUUID().toString()
    }
    
    fun startRecording(): ByteArrayOutputStream {
        return voiceRecorder.startRecording()
    }
    
    fun stopRecording() {
        voiceRecorder.stopRecording()
    }
    
    suspend fun processVoiceInput(
        audioData: ByteArray,
        userId: String?,
        searchResults: List<com.tgdd.app.data.model.SearchResult> = emptyList()
    ): Result<VoiceResponse> = withContext(Dispatchers.IO) {
        try {
            val audioBase64 = voiceRecorder.encodeToBase64(audioData)
            
            val request = VoiceRequest(
                audio_base64 = audioBase64,
                session_id = sessionId,
                user_id = userId,
                history = chatHistory,
                context = if (searchResults.isNotEmpty()) {
                    com.tgdd.app.data.model.VoiceContext(last_search_results = searchResults)
                } else null
            )
            
            val response = voiceApi.processVoice(request)
            
            if (response.isSuccessful && response.body() != null) {
                val voiceResponse = response.body()!!
                
                // Add user message to history (transcribed text from STT)
                val userText = voiceResponse.transcribed_text ?: ""
                if (userText.isNotBlank()) {
                    chatHistory.add(VoiceMessage(
                        role = "user",
                        text = userText
                    ))
                }
                
                // Add assistant response to history
                if (voiceResponse.text.isNotBlank()) {
                    chatHistory.add(VoiceMessage(
                        role = "assistant",
                        text = voiceResponse.text
                    ))
                }

                // Try to get binary MP3 from TTS endpoint
                val ttsBinaryResponse = if (voiceResponse.text.isNotBlank()) {
                    try {
                        android.util.Log.d("VoiceAssistantManager", "Calling TTS for text: ${voiceResponse.text}")
                        voiceApi.synthesizeSpeechBinary(VoiceTtsRequest(text = voiceResponse.text))
                    } catch (e: Exception) {
                        android.util.Log.e("VoiceAssistantManager", "TTS call failed", e)
                        null
                    }
                } else {
                    android.util.Log.w("VoiceAssistantManager", "No text to synthesize")
                    null
                }

                if (ttsBinaryResponse?.isSuccessful == true) {
                    val body = ttsBinaryResponse.body()
                    val binaryAudio = body?.bytes()
                    android.util.Log.d("VoiceAssistantManager", "TTS binary response: ${binaryAudio?.size ?: 0} bytes")
                    if (binaryAudio != null && binaryAudio.isNotEmpty()) {
                        android.util.Log.d("VoiceAssistantManager", "Playing binary audio")
                        audioPlayer.playAudioBytes(binaryAudio)
                    } else {
                        android.util.Log.w("VoiceAssistantManager", "Binary audio empty, falling back to base64")
                        voiceResponse.audio_base64?.let { audio ->
                            audioPlayer.playAudio(audio)
                        }
                    }
                } else {
                    android.util.Log.w("VoiceAssistantManager", "TTS call unsuccessful: ${ttsBinaryResponse?.code()}, falling back to base64")
                    voiceResponse.audio_base64?.let { audio ->
                        audioPlayer.playAudio(audio)
                    }
                }
                
                Result.success(voiceResponse)
            } else {
                Result.failure(Exception("Failed to process voice: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    fun stopAudioPlayback() {
        audioPlayer.stop()
    }
}
