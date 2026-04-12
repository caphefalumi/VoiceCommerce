package com.tgdd.app.ui.profile

import androidx.lifecycle.*
import com.tgdd.app.data.local.UserSession
import com.tgdd.app.data.local.entity.OrderEntity
import com.tgdd.app.data.repository.OrderRepository
import com.tgdd.app.data.repository.UserRepository
import android.util.Log
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val userSession: UserSession,
    private val orderRepository: OrderRepository,
    private val userRepository: UserRepository
) : ViewModel() {

    private val _isLoggedIn = MutableLiveData<Boolean>()
    val isLoggedIn: LiveData<Boolean> = _isLoggedIn

    private val _userName = MutableLiveData<String>()
    val userName: LiveData<String> = _userName

    private val _userEmail = MutableLiveData<String>()
    val userEmail: LiveData<String> = _userEmail

    private val _orders = MutableLiveData<List<OrderEntity>>()
    val orders: LiveData<List<OrderEntity>> = _orders

    val pendingCount: LiveData<Int> = _orders.map { orders ->
        orders.count { it.status == "pending" }
    }

    val preparingCount: LiveData<Int> = _orders.map { orders ->
        orders.count { it.status == "preparing" }
    }

    val shippedCount: LiveData<Int> = _orders.map { orders ->
        orders.count { it.status == "shipped" }
    }

    val deliveredCount: LiveData<Int> = _orders.map { orders ->
        orders.count { it.status == "delivered" }
    }

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    private val _updateSuccess = MutableLiveData<Boolean>()
    val updateSuccess: LiveData<Boolean> = _updateSuccess

    init {
        loadUserSession()
    }

    private fun loadUserSession() {
        val loggedIn = userSession.isLoggedIn()
        _isLoggedIn.value = loggedIn
        if (loggedIn) {
            _userName.value = userSession.getUserName() ?: "User"
            _userEmail.value = userSession.getUserEmail() ?: ""
            loadOrders()
        } else {
            _userName.value = ""
            _userEmail.value = ""
        }
    }

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            userRepository.signIn(email, password).fold(
                onSuccess = { user ->
                    _isLoggedIn.value = true
                    _userName.value = user.name ?: user.email ?: "User"
                    _userEmail.value = user.email ?: ""
                    loadOrders()
                },
                onFailure = { e ->
                    _error.value = e.message ?: "Login failed"
                }
            )
            _isLoading.value = false
        }
    }

    fun register(name: String, email: String, password: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            userRepository.signUp(name, email, password).fold(
                onSuccess = { user ->
                    _isLoggedIn.value = true
                    _userName.value = user.name ?: user.email ?: "User"
                    _userEmail.value = user.email ?: ""
                },
                onFailure = { e ->
                    _error.value = e.message ?: "Registration failed"
                }
            )
            _isLoading.value = false
        }
    }

    fun logout() {
        viewModelScope.launch {
            userRepository.signOut()
            _isLoggedIn.value = false
            _userName.value = ""
            _userEmail.value = ""
            _orders.value = emptyList()
        }
    }

    fun forgotPassword(email: String) {
        viewModelScope.launch {
            _isLoading.value = true
            userRepository.forgotPassword(email).fold(
                onSuccess = { _error.value = null },
                onFailure = { e -> _error.value = e.message }
            )
            _isLoading.value = false
        }
    }

    fun loadOrders() {
        val userId = userSession.getUserId() ?: return
        viewModelScope.launch {
            try {
                orderRepository.syncOrders(userId)
                orderRepository.getOrdersByUserId(userId).collect { orderList ->
                    _orders.value = orderList
                }
            } catch (e: Exception) {
                Log.e(TAG, "Load orders failed: ${e.message}", e)
            }
        }
    }

    fun clearError() { _error.value = null }

    fun updateName(name: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            _updateSuccess.value = false
            userRepository.updateUser(name).fold(
                onSuccess = { user ->
                    _userName.value = user.name ?: user.email ?: "User"
                    _updateSuccess.value = true
                },
                onFailure = { e ->
                    _error.value = e.message ?: "Cập nhật thất bại"
                }
            )
            _isLoading.value = false
        }
    }

    fun clearUpdateSuccess() {
        _updateSuccess.value = false
    }

    fun refreshSession() {
        val loggedIn = userSession.isLoggedIn()
        if (_isLoggedIn.value != loggedIn) {
            _isLoggedIn.value = loggedIn
            if (loggedIn) {
                _userName.value = userSession.getUserName() ?: "User"
                _userEmail.value = userSession.getUserEmail() ?: ""
                loadOrders()
            } else {
                _userName.value = ""
                _userEmail.value = ""
                _orders.value = emptyList()
            }
        }
    }

    companion object {
        private const val TAG = "ProfileViewModel"
    }
}
