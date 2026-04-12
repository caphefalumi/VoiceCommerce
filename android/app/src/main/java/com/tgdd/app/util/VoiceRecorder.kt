package com.tgdd.app.util

import android.content.Context
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.util.Base64
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream

/**
 * Voice recorder using MediaRecorder for PCM audio capture.
 * Records audio from microphone and provides Base64 encoding.
 * 
 * @param context Android context
 * 
 * Recording configuration:
 * - Sample rate: 16000 Hz
 * - Channel: Mono
 * - Encoding: 16-bit PCM
 * - Source: Microphone
 */
class VoiceRecorder(private val context: Context) {
    
    private var audioRecord: AudioRecord? = null
    private var isRecording = false
    private val sampleRate = 16000
    private val channelConfig = AudioFormat.CHANNEL_IN_MONO
    private val audioFormat = AudioFormat.ENCODING_PCM_16BIT
    
    // Minimum buffer size for audio settings
    private val bufferSize = AudioRecord.getMinBufferSize(
        sampleRate,
        channelConfig,
        audioFormat
    )
    
    /**
     * Starts recording and returns audio stream.
     * 
     * @return ByteArrayOutputStream containing PCM audio data
     * 
     * @example
     * ```
     * val recorder = VoiceRecorder(context)
     * val audioStream = recorder.startRecording()
     * // Recording starts...
     * recorder.stopRecording()
     * val base64 = recorder.encodeToBase64(audioStream.toByteArray())
     * ```
     * 
     * Edge cases:
     * - AudioRecord creation failure: returns empty stream, logs error
     * - Permission denied: will fail with SecurityException
     * - Buffer underrun: silently continues recording
     * 
     * Note: Must call stopRecording() to end recording session
     * Warning: Blocking call - runs on IO dispatcher
     */
    suspend fun startRecording(): ByteArrayOutputStream = withContext(Dispatchers.IO) {
        val outputStream = ByteArrayOutputStream()
        
        try {
            // Create AudioRecord instance
            audioRecord = AudioRecord(
                MediaRecorder.AudioSource.MIC,
                sampleRate,
                channelConfig,
                audioFormat,
                bufferSize
            )
            
            audioRecord?.startRecording()
            isRecording = true
            
            val buffer = ByteArray(bufferSize)
            
            // Recording loop - reads until stopRecording() called
            while (isRecording) {
                val read = audioRecord?.read(buffer, 0, buffer.size) ?: 0
                if (read > 0) {
                    outputStream.write(buffer, 0, read)
                }
            }
        } catch (e: Exception) {
            Log.e("VoiceRecorder", "Error recording audio", e)
        }
        
        outputStream
    }
    
    /**
     * Stops recording session.
     * Call after startRecording() to end audio capture.
     * 
     * @example
     * ```
     * recorder.startRecording()
     * delay(5000) // Record for 5 seconds
     * recorder.stopRecording()
     * ```
     */
    fun stopRecording() {
        isRecording = false
        audioRecord?.stop()
        audioRecord?.release()
        audioRecord = null
    }
    
    /**
     * Encodes raw audio bytes to Base64 string.
     * 
     * @param audioData Raw PCM audio bytes
     * @return Base64-encoded string (no wrap)
     * 
     * @example
     * ```
     * val base64 = recorder.encodeToBase64(audioStream.toByteArray())
     * // Can be sent over network or stored
     * ```
     */
    fun encodeToBase64(audioData: ByteArray): String {
        return Base64.encodeToString(audioData, Base64.NO_WRAP)
    }
}