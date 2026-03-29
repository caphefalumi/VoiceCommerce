package com.tgdd.app.ui.help

import android.content.Context
import androidx.lifecycle.*
import com.tgdd.app.data.repository.TicketRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class HelpViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val ticketRepository: TicketRepository
) : ViewModel() {

    private val prefs = context.getSharedPreferences("user_prefs", Context.MODE_PRIVATE)

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    private val _userError = MutableLiveData<String?>()
    val userError: LiveData<String?> = _userError

    fun getUserId(): String? {
        return prefs.getString("user_id", null)
    }

    suspend fun submitTicket(
        userId: String?,
        category: String,
        description: String
    ): Result<String> {
        _isLoading.value = true
        _userError.value = null

        return try {
            val result = ticketRepository.createTicket(userId, category, description)
            _isLoading.value = false
            
            result.fold(
                onSuccess = { confirmation ->
                    Result.success(confirmation)
                },
                onFailure = { error ->
                    _userError.value = error.message
                    Result.failure(error)
                }
            )
        } catch (e: Exception) {
            _isLoading.value = false
            _userError.value = e.message
            Result.failure(e)
        }
    }

    fun clearError() {
        _userError.value = null
    }
}
