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

    private val _loginSuccess = MutableLiveData<SingleEvent<Unit>>()
    val loginSuccess: LiveData<SingleEvent<Unit>> = _loginSuccess

    private val _verificationRequired = MutableLiveData<SingleEvent<String>>()
    val verificationRequired: LiveData<SingleEvent<String>> = _verificationRequired

    fun signInWithEmailPassword(email: String, password: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                userRepository.signIn(email, password).fold(
                    onSuccess = { _loginSuccess.value = SingleEvent(Unit) },
                    onFailure = { e -> _error.value = e.message ?: "Đăng nhập thất bại" },
                )
            } catch (e: Exception) {
                _error.value = e.message ?: "Đăng nhập thất bại"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun registerWithEmailPassword(name: String, email: String, password: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                userRepository.signUp(name, email, password).fold(
                    onSuccess = { _loginSuccess.value = SingleEvent(Unit) },
                    onFailure = { e -> _error.value = e.message ?: "Đăng ký thất bại" }
                )
            } catch (e: Exception) {
                _error.value = e.message ?: "Đăng ký thất bại"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun signInWithFirebase(firebaseIdToken: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                userRepository.signInWithFirebase(firebaseIdToken).fold(
                    onSuccess = { _loginSuccess.value = SingleEvent(Unit) },
                    onFailure = { e -> _error.value = e.message ?: "Đăng nhập Firebase thất bại" }
                )
            } catch (e: Exception) {
                _error.value = e.message ?: "Đăng nhập Firebase thất bại"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun onFirebaseGoogleSignIn(idToken: String) {
        signInWithFirebase(idToken)
    }

    fun clearError() { _error.value = null }
    fun resetLoginSuccess() { _loginSuccess.value = SingleEvent(Unit) }
}

class SingleEvent<out T>(private val content: T) {
    private var hasBeenHandled = false

    fun getContentIfNotHandled(): T? = synchronized(this) {
        if (hasBeenHandled) null
        else {
            hasBeenHandled = true
            content
        }
    }

    fun peekContent(): T = content
}
