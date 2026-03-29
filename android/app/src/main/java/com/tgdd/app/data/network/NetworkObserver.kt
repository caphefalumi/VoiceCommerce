package com.tgdd.app.data.network

import android.content.Context
import androidx.lifecycle.LiveData

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
