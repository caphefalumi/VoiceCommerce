package com.tgdd.app.ui.address

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tgdd.app.data.local.UserSession
import com.tgdd.app.data.local.entity.AddressEntity
import com.tgdd.app.data.repository.AddressRepository
import com.tgdd.app.utils.ValidationUtils
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AddressViewModel @Inject constructor(
    private val addressRepository: AddressRepository,
    private val userSession: UserSession
) : ViewModel() {

    private val _addresses = MutableStateFlow<List<AddressEntity>>(emptyList())
    val addresses: StateFlow<List<AddressEntity>> = _addresses.asStateFlow()

    private val _selectedAddress = MutableStateFlow<AddressEntity?>(null)
    val selectedAddress: StateFlow<AddressEntity?> = _selectedAddress.asStateFlow()

    private val _message = MutableStateFlow<String?>(null)
    val message: StateFlow<String?> = _message.asStateFlow()

    private val _validationError = MutableStateFlow<String?>(null)
    val validationError: StateFlow<String?> = _validationError.asStateFlow()

    init {
        loadAddresses()
    }

    private fun loadAddresses() {
        viewModelScope.launch {
            val userId = userSession.getUserId() ?: return@launch
            addressRepository.getAddressesByUserId(userId).collect { addressList ->
                _addresses.value = addressList
                if (_selectedAddress.value == null) {
                    _selectedAddress.value = addressList.firstOrNull { it.isDefault }
                }
            }
        }
    }

    fun selectAddress(address: AddressEntity) {
        _selectedAddress.value = address
    }

    fun saveAddress(
        name: String,
        phone: String,
        street: String,
        city: String,
        district: String = "",
        ward: String = "",
        label: String = "Home",
        isDefault: Boolean = false
    ) {
        viewModelScope.launch {
            val validation = ValidationUtils.validateCheckoutData(name, phone, "$street, $city")
            if (validation is ValidationUtils.ValidationResult.Error) {
                _validationError.value = validation.message
                return@launch
            }

            val userId = userSession.getUserId() ?: return@launch
            val address = AddressEntity(
                userId = userId,
                name = name,
                phone = phone,
                street = street,
                city = city,
                district = district,
                ward = ward,
                label = label,
                isDefault = isDefault
            )
            addressRepository.insertAddress(address)
            _message.value = "Đã lưu địa chỉ"
        }
    }

    fun updateAddress(address: AddressEntity) {
        viewModelScope.launch {
            addressRepository.updateAddress(address)
            _message.value = "Đã cập nhật địa chỉ"
        }
    }

    fun deleteAddress(address: AddressEntity) {
        viewModelScope.launch {
            addressRepository.deleteAddress(address)
            _message.value = "Đã xóa địa chỉ"
        }
    }

    fun setAsDefault(addressId: Long) {
        viewModelScope.launch {
            val userId = userSession.getUserId() ?: return@launch
            addressRepository.setAsDefault(addressId, userId)
            _message.value = "Đã đặt làm địa chỉ mặc định"
        }
    }

    fun clearMessage() {
        _message.value = null
    }

    fun clearValidationError() {
        _validationError.value = null
    }
}
