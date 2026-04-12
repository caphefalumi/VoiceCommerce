package com.tgdd.app.ui.auth

import androidx.lifecycle.*
import com.tgdd.app.data.repository.UserRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel for authentication screen.
 *
 * Responsibilities:
 * - Sign in with email/password
 * - Register new accounts
 * - Sign in with Firebase (Google OAuth)
 * - Handle verification requirements
 *
 * UI State:
 * - isLoading: Boolean - Auth operation in progress
 * - error: String? - Error message for display
 * - loginSuccess: SingleEvent<Unit> - One-time login success event
 * - verificationRequired: SingleEvent<String> - Email verification trigger
 *
 * Auth Methods:
 * - Email/Password: Traditional email + password authentication
 * - Firebase: Google OAuth via Firebase ID token exchange
 *
 * @see AuthFragment For UI binding
 * @see UserRepository For auth operations
 */
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

    /**
     * Signs in user with email and password.
     * Uses UserRepository for authentication.
     */
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

    /**
     * Registers new user with email and password.
     * Uses Firebase for account creation.
     */
    fun registerWithEmailPassword(name: String, email: String, password: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                userRepository.signUpWithFirebase(name, email, password).fold(
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

    /**
     * Signs in via Firebase token exchange.
     * Called after Firebase Google Sign-In completes.
     *
     * @param firebaseIdToken Token from Firebase Google Sign-In
     */
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
}

/**
 * Wrapper for one-time events (navigation, snackbars).
 * Prevents duplicate handling on configuration changes (rotation, etc).
 *
 * Usage: Observe via getContentIfNotHandled() in Fragment.
 */
class SingleEvent<out T>(private val content: T) {
    private var hasBeenHandled = false

    /** Returns content only once, null after first call */
    fun getContentIfNotHandled(): T? = synchronized(this) {
        if (hasBeenHandled) null
        else {
            hasBeenHandled = true
            content
        }
    }

    /** Always returns content (for debugging) */
    fun peekContent(): T = content
}
