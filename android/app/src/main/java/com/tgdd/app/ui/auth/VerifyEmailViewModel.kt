package com.tgdd.app.ui.auth

import android.content.Context
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tgdd.app.R
import com.tgdd.app.data.repository.UserRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class VerifyEmailViewModel @Inject constructor(
    private val userRepository: UserRepository,
    @ApplicationContext private val context: Context
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
            _verifyStatus.value = VerifyStatus.Error(context.getString(R.string.email_verification_failed))
            return
        }

        viewModelScope.launch {
            _verifyStatus.value = VerifyStatus.Loading
            userRepository.verifyEmail(token).fold(
                onSuccess = { _verifyStatus.value = VerifyStatus.Success },
                onFailure = { e -> 
                    _verifyStatus.value = VerifyStatus.Error(
                        e.message ?: context.getString(R.string.verify_email_failed_generic)
                    )
                }
            )
        }
    }
}
