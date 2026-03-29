package com.tgdd.app.ui.auth

import androidx.lifecycle.*
import com.tgdd.app.data.repository.UserRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val userRepository: UserRepository
) : ViewModel() {

    private val _isLoading = MutableLiveData(false)
    val isLoading: LiveData<Boolean> = _isLoading

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    private val _loginSuccess = MutableLiveData(false)
    val loginSuccess: LiveData<Boolean> = _loginSuccess

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            userRepository.signIn(email, password).fold(
                onSuccess = { _loginSuccess.value = true },
                onFailure = { e -> _error.value = e.message ?: "Đăng nhập thất bại" }
            )
            _isLoading.value = false
        }
    }

    fun register(name: String, email: String, password: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            userRepository.signUp(name, email, password).fold(
                onSuccess = { _loginSuccess.value = true },
                onFailure = { e -> _error.value = e.message ?: "Đăng ký thất bại" }
            )
            _isLoading.value = false
        }
    }

    fun clearError() { _error.value = null }
    fun resetLoginSuccess() { _loginSuccess.value = false }
}
