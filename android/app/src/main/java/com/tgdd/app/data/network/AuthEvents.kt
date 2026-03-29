package com.tgdd.app.data.network

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData

object AuthEvents {
    private val _authError = MutableLiveData<String?>()
    val authError: LiveData<String?> = _authError
    
    fun postAuthError(message: String) {
        _authError.postValue(message)
    }
    
    fun clearAuthError() {
        _authError.value = null
    }
}
