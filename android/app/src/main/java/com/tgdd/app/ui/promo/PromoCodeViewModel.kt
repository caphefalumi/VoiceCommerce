package com.tgdd.app.ui.promo

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tgdd.app.data.local.entity.PromoCodeEntity
import com.tgdd.app.data.repository.PromoCodeRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class PromoCodeViewModel @Inject constructor(
    private val promoCodeRepository: PromoCodeRepository
) : ViewModel() {

    private val _promoCodes = MutableStateFlow<List<PromoCodeEntity>>(emptyList())
    val promoCodes: StateFlow<List<PromoCodeEntity>> = _promoCodes.asStateFlow()

    private val _appliedPromoCode = MutableStateFlow<PromoCodeEntity?>(null)
    val appliedPromoCode: StateFlow<PromoCodeEntity?> = _appliedPromoCode.asStateFlow()

    private val _discountAmount = MutableStateFlow(0.0)
    val discountAmount: StateFlow<Double> = _discountAmount.asStateFlow()

    private val _message = MutableStateFlow<String?>(null)
    val message: StateFlow<String?> = _message.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    init {
        loadPromoCodes()
    }

    private fun loadPromoCodes() {
        viewModelScope.launch {
            promoCodeRepository.getActivePromoCodes().collect { codes ->
                _promoCodes.value = codes
            }
        }
    }

    fun validatePromoCode(code: String, orderTotal: Double) {
        viewModelScope.launch {
            val result = promoCodeRepository.validatePromoCode(code, orderTotal)
            if (result.isSuccess) {
                val discount = result.getOrThrow()
                _discountAmount.value = discount
                _message.value = "Mã giảm giá hợp lệ! Giảm ${discount.toInt()}đ"
            } else {
                _error.value = result.exceptionOrNull()?.message
                _discountAmount.value = 0.0
            }
        }
    }

    fun applyPromoCode(code: String, orderTotal: Double, onSuccess: (Double, Double) -> Unit) {
        viewModelScope.launch {
            val result = promoCodeRepository.applyPromoCode(code, orderTotal)
            if (result.isSuccess) {
                val (discount, finalTotal) = result.getOrThrow()
                _discountAmount.value = discount
                _appliedPromoCode.value = _promoCodes.value.find { it.code == code }
                _message.value = "Đã áp dụng mã giảm giá"
                onSuccess(discount, finalTotal)
            } else {
                _error.value = result.exceptionOrNull()?.message
            }
        }
    }

    fun removePromoCode() {
        _appliedPromoCode.value = null
        _discountAmount.value = 0.0
        _message.value = "Đã xóa mã giảm giá"
    }

    fun syncPromoCodes() {
        viewModelScope.launch {
            promoCodeRepository.syncPromoCodes()
        }
    }

    fun clearMessage() {
        _message.value = null
    }

    fun clearError() {
        _error.value = null
    }
}
