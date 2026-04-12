package com.tgdd.app.util

import android.content.Context
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.util.Base64
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * Voice recorder using AudioRecord for PCM audio capture.
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
    @Volatile
    private var isRecording = false
    private var recordingJob: Job? = null
    private var outputStream: ByteArrayOutputStream? = null
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
     * Starts recording and returns audio stream immediately.
     * Recording happens in background coroutine.
     * 
     * @return ByteArrayOutputStream that will contain PCM audio data
     * 
     * @example
     * ```
     * val recorder = VoiceRecorder(context)
     * val audioStream = recorder.startRecording()
     * // Recording starts in background...
     * delay(5000)
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
     */
    fun startRecording(): ByteArrayOutputStream {
        // Stop any existing recording first
        if (isRecording) {
            stopRecording()
        }
        
        outputStream = ByteArrayOutputStream()
        isRecording = true
        
        try {
            // Create AudioRecord instance
            audioRecord = AudioRecord(
                MediaRecorder.AudioSource.MIC,
                sampleRate,
                channelConfig,
                audioFormat,
                bufferSize
            )
            
            // Check if AudioRecord was initialized successfully
            if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
                Log.e("VoiceRecorder", "AudioRecord initialization failed")
                isRecording = false
                return outputStream!!
            }
            
            audioRecord?.startRecording()
            Log.d("VoiceRecorder", "AudioRecord started successfully")
            
            // Start recording in background
            recordingJob = CoroutineScope(Dispatchers.IO).launch {
                val buffer = ByteArray(bufferSize)
                
                // Recording loop - reads until stopRecording() called
                while (isRecording) {
                    val read = audioRecord?.read(buffer, 0, buffer.size) ?: 0
                    if (read > 0) {
                        outputStream?.write(buffer, 0, read)
                    } else if (read < 0) {
                        Log.e("VoiceRecorder", "Error reading audio data: $read")
                        break
                    }
                }
                Log.d("VoiceRecorder", "Recording loop ended")
            }
        } catch (e: Exception) {
            Log.e("VoiceRecorder", "Error starting recording", e)
            isRecording = false
        }
        
        return outputStream!!
    }
    
    /**
     * Stops recording session.
     * Call after startRecording() to end audio capture.
     * 
     * @example
     * ```
     * val stream = recorder.startRecording()
     * delay(5000) // Record for 5 seconds
     * recorder.stopRecording()
     * ```
     */
    fun stopRecording() {
        if (!isRecording) {
            Log.d("VoiceRecorder", "Already stopped or not recording")
            return
        }
        
        Log.d("VoiceRecorder", "Stopping recording...")
        isRecording = false
        
        try {
            // Stop and release AudioRecord
            audioRecord?.apply {
                if (state == AudioRecord.STATE_INITIALIZED) {
                    stop()
                    Log.d("VoiceRecorder", "AudioRecord stopped")
                }
                release()
                Log.d("VoiceRecorder", "AudioRecord released")
            }
        } catch (e: Exception) {
            Log.e("VoiceRecorder", "Error stopping AudioRecord", e)
        } finally {
            audioRecord = null
            recordingJob?.cancel()
            recordingJob = null
        }
    }
    
    /**
     * Converts raw PCM audio to WAV format and encodes to Base64.
     * 
     * @param audioData Raw PCM audio bytes
     * @return Base64-encoded WAV file string (no wrap)
     * 
     * @example
     * ```
     * val base64 = recorder.encodeToBase64(audioStream.toByteArray())
     * // Can be sent over network or stored
     * ```
     */
    fun encodeToBase64(audioData: ByteArray): String {
        Log.d("VoiceRecorder", "Encoding ${audioData.size} bytes of PCM data to WAV")
        val wavData = convertPcmToWav(audioData)
        Log.d("VoiceRecorder", "WAV file size: ${wavData.size} bytes")
        val base64 = Base64.encodeToString(wavData, Base64.NO_WRAP)
        Log.d("VoiceRecorder", "Base64 length: ${base64.length} chars")
        return base64
    }
    
    /**
     * Converts raw PCM data to WAV format.
     * Adds WAV header to raw PCM audio data using proper little-endian byte ordering.
     * 
     * @param pcmData Raw PCM audio bytes
     * @return WAV formatted audio bytes
     */
    private fun convertPcmToWav(pcmData: ByteArray): ByteArray {
        val channels: Short = 1 // Mono
        val bitDepth: Short = 16 // 16-bit
        
        // Convert multi-byte integers to raw bytes in little endian format
        val littleBytes = ByteBuffer
            .allocate(14)
            .order(ByteOrder.LITTLE_ENDIAN)
            .putShort(channels)
            .putInt(sampleRate)
            .putInt(sampleRate * channels * (bitDepth / 8))
            .putShort((channels * (bitDepth / 8)).toShort())
            .putShort(bitDepth)
            .array()
        
        // Calculate sizes
        val dataSize = pcmData.size
        val chunkSize = dataSize + 36
        
        val sizeBytes = ByteBuffer
            .allocate(8)
            .order(ByteOrder.LITTLE_ENDIAN)
            .putInt(chunkSize) // ChunkSize
            .putInt(dataSize)  // Subchunk2Size
            .array()
        
        // Build WAV header (44 bytes)
        val header = byteArrayOf(
            // RIFF header
            'R'.code.toByte(), 'I'.code.toByte(), 'F'.code.toByte(), 'F'.code.toByte(), // ChunkID
            sizeBytes[0], sizeBytes[1], sizeBytes[2], sizeBytes[3], // ChunkSize
            'W'.code.toByte(), 'A'.code.toByte(), 'V'.code.toByte(), 'E'.code.toByte(), // Format
            // fmt subchunk
            'f'.code.toByte(), 'm'.code.toByte(), 't'.code.toByte(), ' '.code.toByte(), // Subchunk1ID
            16, 0, 0, 0, // Subchunk1Size (16 for PCM)
            1, 0, // AudioFormat (1 = PCM)
            littleBytes[0], littleBytes[1], // NumChannels
            littleBytes[2], littleBytes[3], littleBytes[4], littleBytes[5], // SampleRate
            littleBytes[6], littleBytes[7], littleBytes[8], littleBytes[9], // ByteRate
            littleBytes[10], littleBytes[11], // BlockAlign
            littleBytes[12], littleBytes[13], // BitsPerSample
            // data subchunk
            'd'.code.toByte(), 'a'.code.toByte(), 't'.code.toByte(), 'a'.code.toByte(), // Subchunk2ID
            sizeBytes[4], sizeBytes[5], sizeBytes[6], sizeBytes[7] // Subchunk2Size
        )
        
        // Combine header and PCM data
        return header + pcmData
    }
}