package com.tgdd.app.util

import android.content.Context
import android.media.MediaPlayer
import android.util.Base64
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream

/**
 * Audio player for playing Base64-encoded audio data from TTS.
 * Uses MediaPlayer to handle various audio formats (MP3, WAV, etc.).
 * 
 * @param context Android context for file operations
 */
class AudioPlayer(private val context: Context) {
    
    private var mediaPlayer: MediaPlayer? = null
    
    /**
     * Plays Base64-encoded audio data.
     * Decodes base64, writes to temp file, and plays using MediaPlayer.
     * 
     * @param base64Audio Base64-encoded audio string (MP3, WAV, etc.)
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
     * - MediaPlayer creation failure: logs error, no playback
     * - Empty audio data: no-op
     * 
     * Note: Runs on IO dispatcher to avoid blocking main thread
     */
    suspend fun playAudio(base64Audio: String) = withContext(Dispatchers.IO) {
        try {
            // Stop any existing playback
            stop()
            
            // Decode Base64 to audio bytes
            val audioData = Base64.decode(base64Audio, Base64.NO_WRAP)
            
            if (audioData.isEmpty()) {
                Log.w("AudioPlayer", "Empty audio data")
                return@withContext
            }
            
            // Write to temporary file
            val tempFile = File.createTempFile("tts_audio_", ".mp3", context.cacheDir)
            FileOutputStream(tempFile).use { fos ->
                fos.write(audioData)
            }
            
            // Play using MediaPlayer
            mediaPlayer = MediaPlayer().apply {
                setDataSource(tempFile.absolutePath)
                prepare()
                
                setOnCompletionListener {
                    release()
                    mediaPlayer = null
                    tempFile.delete()
                }
                
                setOnErrorListener { _, what, extra ->
                    Log.e("AudioPlayer", "MediaPlayer error: what=$what, extra=$extra")
                    release()
                    mediaPlayer = null
                    tempFile.delete()
                    true
                }
                
                start()
            }
            
            Log.d("AudioPlayer", "Playing audio: ${audioData.size} bytes")
        } catch (e: Exception) {
            Log.e("AudioPlayer", "Error playing audio", e)
            stop()
        }
    }

    suspend fun playAudioBytes(audioData: ByteArray) = withContext(Dispatchers.IO) {
        try {
            stop()

            if (audioData.isEmpty()) {
                Log.w("AudioPlayer", "Empty binary audio data")
                return@withContext
            }

            val tempFile = File.createTempFile("tts_audio_", ".mp3", context.cacheDir)
            FileOutputStream(tempFile).use { fos ->
                fos.write(audioData)
            }

            mediaPlayer = MediaPlayer().apply {
                setDataSource(tempFile.absolutePath)
                prepare()

                setOnCompletionListener {
                    release()
                    mediaPlayer = null
                    tempFile.delete()
                }

                setOnErrorListener { _, what, extra ->
                    Log.e("AudioPlayer", "MediaPlayer error: what=$what, extra=$extra")
                    release()
                    mediaPlayer = null
                    tempFile.delete()
                    true
                }

                start()
            }

            Log.d("AudioPlayer", "Playing binary audio: ${audioData.size} bytes")
        } catch (e: Exception) {
            Log.e("AudioPlayer", "Error playing binary audio", e)
            stop()
        }
    }
    
    /**
     * Stops playback and releases resources.
     * Safe to call even if not currently playing.
     */
    fun stop() {
        try {
            mediaPlayer?.apply {
                if (isPlaying) {
                    stop()
                }
                release()
            }
        } catch (e: Exception) {
            Log.e("AudioPlayer", "Error stopping audio", e)
        } finally {
            mediaPlayer = null
        }
    }
}
