package com.tgdd.app.ui.auth

import androidx.lifecycle.*
import com.tgdd.app.data.repository.UserRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ForgotPasswordViewModel @Inject constructor(
    private val userRepository: UserRepository
) : ViewModel() {

    private val _isLoading = MutableLiveData(false)
    val isLoading: LiveData<Boolean> = _isLoading

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    private val _success = MutableLiveData(false)
    val success: LiveData<Boolean> = _success

    fun sendReset(email: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            userRepository.forgotPassword(email).fold(
                onSuccess = { _success.value = true },
                onFailure = { e -> _error.value = e.message ?: "Có lỗi xảy ra" }
            )
            _isLoading.value = false
        }
    }
}
