package com.tgdd.app.data.network

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData

/**
 * Monitors device network connectivity status using Android's ConnectivityManager.
 *
 * This class registers a network callback to receive real-time updates when the
 * device's network connection changes (wifi ↔ cellular ↔ disconnected).
 *
 * ### What It Monitors:
 * - Network availability (is any network present?)
 * - Internet capability (can the network reach the internet?)
 * - Validation (has the network been proven to work?)
 *
 * ### Network Capabilities Checked:
 * - NET_CAPABILITY_INTERNET: Network can reach the internet
 * - NET_CAPABILITY_VALIDATED: Network has proven internet access (DNS works)
 *
 * ### Usage:
 * - Singleton pattern via getInstance()
 * - Use NetworkObserver wrapper for easier access with LiveData
 * - Call startMonitoring() when app enters foreground
 * - Call stopMonitoring() when app enters background
 *
 * ### LiveData Flow:
 * - isConnected: LiveData<Boolean> - UI observes for connectivity changes
 * - Updates posted on background threads via postValue()
 */
class NetworkMonitor(private val context: Context) {
    
    private val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    
    private val _isConnected = MutableLiveData<Boolean>()
    val isConnected: LiveData<Boolean> = _isConnected
    
    private val networkCallback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            _isConnected.postValue(isCurrentlyConnected())
        }
        
        override fun onLost(network: Network) {
            _isConnected.postValue(isCurrentlyConnected())
        }
        
        override fun onCapabilitiesChanged(network: Network, capabilities: NetworkCapabilities) {
            val hasInternet = capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            val validated = capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
            _isConnected.postValue(hasInternet && validated)
        }
    }
    
    fun startMonitoring() {
        val networkRequest = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()
        connectivityManager.registerNetworkCallback(networkRequest, networkCallback)
        
        // Set initial state
        _isConnected.value = isCurrentlyConnected()
    }
    
    fun stopMonitoring() {
        try {
            connectivityManager.unregisterNetworkCallback(networkCallback)
        } catch (e: Exception) {
            // Callback not registered
        }
    }
    
    fun isCurrentlyConnected(): Boolean {
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
            capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }
    
    companion object {
        @Volatile
        private var INSTANCE: NetworkMonitor? = null
        
        fun getInstance(context: Context): NetworkMonitor {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: NetworkMonitor(context.applicationContext).also { INSTANCE = it }
            }
        }
    }
}
