package com.tgdd.app.data.repository

import android.content.Context
import com.tgdd.app.data.model.VoiceMessage
import com.tgdd.app.data.model.VoiceRequest
import com.tgdd.app.data.model.VoiceResponse
import com.tgdd.app.data.remote.VoiceApi
import com.tgdd.app.util.AudioPlayer
import com.tgdd.app.util.VoiceRecorder
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
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
    
    suspend fun startRecording() = withContext(Dispatchers.IO) {
        voiceRecorder.startRecording()
    }
    
    fun stopRecording() {
        voiceRecorder.stopRecording()
    }
    
    suspend fun processVoiceInput(
        audioData: ByteArray,
        userId: String?
    ): Result<VoiceResponse> = withContext(Dispatchers.IO) {
        try {
            val audioBase64 = voiceRecorder.encodeToBase64(audioData)
            
            val request = VoiceRequest(
                audio_base64 = audioBase64,
                session_id = sessionId,
                user_id = userId,
                history = chatHistory
            )
            
            val response = voiceApi.processVoice(request)
            
            if (response.isSuccessful && response.body() != null) {
                val voiceResponse = response.body()!!
                
                // Add user message to history
                chatHistory.add(VoiceMessage(
                    role = "user",
                    text = voiceResponse.text // The transcribed text from user
                ))
                
                // Add assistant response to history
                chatHistory.add(VoiceMessage(
                    role = "assistant",
                    text = voiceResponse.text
                ))
                
                // Play audio response if available
                voiceResponse.audio_base64?.let { audio ->
                    audioPlayer.playAudio(audio)
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
