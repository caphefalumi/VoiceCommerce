package com.tgdd.app.ui.auth

import androidx.lifecycle.*
import com.tgdd.app.data.repository.UserRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ResetPasswordViewModel @Inject constructor(
    private val userRepository: UserRepository
) : ViewModel() {

    private val _isLoading = MutableLiveData(false)
    val isLoading: LiveData<Boolean> = _isLoading

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    private val _resetSuccess = MutableLiveData(false)
    val resetSuccess: LiveData<Boolean> = _resetSuccess

    fun resetPassword(token: String, newPassword: String, confirmPassword: String) {
        if (newPassword != confirmPassword) {
            _error.value = "Mật khẩu xác nhận không khớp"
            return
        }
        if (newPassword.length < 6) {
            _error.value = "Mật khẩu phải có ít nhất 6 ký tự"
            return
        }
        if (token.isBlank()) {
            _error.value = "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn"
            return
        }

        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            userRepository.resetPassword(token, newPassword).fold(
                onSuccess = { _resetSuccess.value = true },
                onFailure = { e -> _error.value = e.message ?: "Có lỗi xảy ra" }
            )
            _isLoading.value = false
        }
    }

    fun clearError() { _error.value = null }
}
