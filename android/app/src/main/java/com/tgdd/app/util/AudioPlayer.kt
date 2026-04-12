package com.tgdd.app.util

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.util.Base64
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Audio player for playing Base64-encoded PCM audio data.
 * Uses AudioTrack in streaming mode for memory-efficient playback.
 * 
 * @param context Android context for audio attributes
 * 
 * Audio configuration:
 * - Sample rate: 16000 Hz
 * - Channel: Mono
 * - Encoding: 16-bit PCM
 */
class AudioPlayer(private val context: Context) {
    
    private var audioTrack: AudioTrack? = null
    private val sampleRate = 16000
    private val channelConfig = AudioFormat.CHANNEL_OUT_MONO
    private val audioFormat = AudioFormat.ENCODING_PCM_16BIT
    
    /**
     * Plays Base64-encoded audio data.
     * 
     * @param base64Audio Base64-encoded PCM audio string
     * @return Unit (suspends until playback completes)
     * 
     * @example
     * ```
     * val player = AudioPlayer(context)
     * player.playAudio(base64AudioData)
     * ```
     * 
     * Edge cases:
     * - Invalid Base64: throws IllegalArgumentException
     * - AudioTrack creation failure: logs error, no playback
     * - Empty audio data: no-op (writes 0 bytes)
     * 
     * Note: Runs on IO dispatcher to avoid blocking main thread
     */
    suspend fun playAudio(base64Audio: String) = withContext(Dispatchers.IO) {
        try {
            // Decode Base64 to raw PCM bytes
            val audioData = Base64.decode(base64Audio, Base64.NO_WRAP)
            
            // Calculate minimum buffer size for audio settings
            val bufferSize = AudioTrack.getMinBufferSize(
                sampleRate,
                channelConfig,
                audioFormat
            )
            
            // Create AudioTrack with streaming mode
            audioTrack = AudioTrack.Builder()
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build()
                )
                .setAudioFormat(
                    AudioFormat.Builder()
                        .setEncoding(audioFormat)
                        .setSampleRate(sampleRate)
                        .setChannelMask(channelConfig)
                        .build()
                )
                .setBufferSizeInBytes(bufferSize)
                .setTransferMode(AudioTrack.MODE_STREAM)
                .build()
            
            // Stream audio data to playback
            audioTrack?.play()
            audioTrack?.write(audioData, 0, audioData.size)
            audioTrack?.stop()
            audioTrack?.release()
            audioTrack = null
        } catch (e: Exception) {
            Log.e("AudioPlayer", "Error playing audio", e)
        }
    }
    
    /**
     * Stops playback and releases resources.
     * Safe to call even if not currently playing.
     */
    fun stop() {
        audioTrack?.stop()
        audioTrack?.release()
        audioTrack = null
    }
}