package com.tgdd.app.ui.chatbot

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tgdd.app.data.remote.ChatApi
import com.tgdd.app.data.remote.ChatRequest
import com.tgdd.app.data.local.UserSession
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

data class ChatMessage(
    val id: String,
    val role: String, // "user" or "assistant"
    val content: String,
    val timestamp: Date
)

@HiltViewModel
class ChatbotViewModel @Inject constructor(
    private val chatApi: ChatApi,
    private val userSession: UserSession
) : ViewModel() {
    
    private val _messages = MutableStateFlow<List<ChatMessage>>(emptyList())
    val messages: StateFlow<List<ChatMessage>> = _messages.asStateFlow()
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()
    
    fun clearMessages() {
        _messages.value = emptyList()
    }
    
    fun sendMessage(text: String) {
        viewModelScope.launch {
            try {
                _isLoading.value = true
                _error.value = null
                
                // Add user message
                val userMessage = ChatMessage(
                    id = UUID.randomUUID().toString(),
                    role = "user",
                    content = text,
                    timestamp = Date()
                )
                _messages.value = _messages.value + userMessage
                
                // Get user ID if logged in
                val userId = userSession.getUserId()
                
                // Build history for context
                val history = _messages.value.map { msg ->
                    mapOf(
                        "role" to msg.role,
                        "text" to msg.content
                    )
                }
                
                // Send to AI worker
                val response = chatApi.sendChatMessage(
                    ChatRequest(
                        text = text,
                        user_id = userId,
                        history = history
                    )
                )
                
                if (response.isSuccessful) {
                    val responseText = response.body()?.response_text ?: "Sorry, I couldn't process that."
                    
                    // Add assistant message
                    val assistantMessage = ChatMessage(
                        id = UUID.randomUUID().toString(),
                        role = "assistant",
                        content = responseText,
                        timestamp = Date()
                    )
                    _messages.value = _messages.value + assistantMessage
                } else {
                    _error.value = "Failed to get response: ${response.message()}"
                }
            } catch (e: Exception) {
                _error.value = "Error: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
}
