package com.tgdd.app.data.network

import android.content.Context
import androidx.lifecycle.LiveData

/**
 * Static wrapper object for NetworkMonitor providing simplified network connectivity access.
 *
 * This singleton object provides a convenient API for accessing network
 * status without manually managing NetworkMonitor instances.
 *
 * ### Usage:
 * ```
 * // Initialize once in Application.onCreate()
 * NetworkObserver.init(context)
 *
 * // Observe connectivity in UI
 * NetworkObserver.isConnected?.observe(viewOwner) { isConnected ->
 *     // Update UI based on connectivity
 * }
 *
 * // Check connectivity synchronously
 * if (NetworkObserver.isCurrentlyConnected()) {
 *     // Make network request
 * }
 *
 * // Cleanup in Application.onTerminate()
 * NetworkObserver.shutdown()
 * ```
 *
 * ### Thread Safety:
 * - isConnected returns nullable LiveData (may be null before init())
 * - isCurrentlyConnected() is safe to call from any thread
 */
object NetworkObserver {
    private var networkMonitor: NetworkMonitor? = null
    
    fun init(context: Context) {
        networkMonitor = NetworkMonitor.getInstance(context)
        networkMonitor?.startMonitoring()
    }
    
    val isConnected: LiveData<Boolean>?
        get() = networkMonitor?.isConnected
    
    fun isCurrentlyConnected(): Boolean {
        return networkMonitor?.isCurrentlyConnected() ?: true
    }
    
    fun shutdown() {
        networkMonitor?.stopMonitoring()
    }
}
