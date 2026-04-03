package com.tgdd.app.ui.auth

import androidx.lifecycle.*
import com.tgdd.app.data.repository.UserRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class VerifyEmailViewModel @Inject constructor(
    private val userRepository: UserRepository
) : ViewModel() {

    private val _verifyStatus = MutableLiveData<VerifyStatus>(VerifyStatus.Loading)
    val verifyStatus: LiveData<VerifyStatus> = _verifyStatus

    sealed class VerifyStatus {
        object Loading : VerifyStatus()
        object Success : VerifyStatus()
        data class Error(val message: String) : VerifyStatus()
    }

    fun verifyEmail(token: String) {
        if (token.isBlank()) {
            _verifyStatus.value = VerifyStatus.Error("Liên kết xác minh không hợp lệ hoặc đã hết hạn.")
            return
        }

        viewModelScope.launch {
            _verifyStatus.value = VerifyStatus.Loading
            userRepository.verifyEmail(token).fold(
                onSuccess = { _verifyStatus.value = VerifyStatus.Success },
                onFailure = { e -> 
                    _verifyStatus.value = VerifyStatus.Error(e.message ?: "Xác minh email thất bại. Vui lòng thử lại.")
                }
            )
        }
    }
}
