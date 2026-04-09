package com.tgdd.app.utils

import android.util.Patterns

object ValidationUtils {
    fun isValidEmail(email: String): Boolean {
        return email.isNotBlank() && Patterns.EMAIL_ADDRESS.matcher(email).matches()
    }

    fun isValidPhone(phone: String): Boolean {
        // Vietnamese phone number: 10 digits starting with 0
        val phonePattern = "^0[0-9]{9}$".toRegex()
        return phone.matches(phonePattern)
    }

    fun isValidAddress(address: String): Boolean {
        return address.isNotBlank() && address.length >= 10
    }

    fun isValidName(name: String): Boolean {
        return name.isNotBlank() && name.length >= 2
    }

    fun isValidPassword(password: String): Boolean {
        return password.length >= 6
    }

    fun formatPhoneNumber(phone: String): String {
        val cleaned = phone.replace(Regex("[^0-9]"), "")
        return when {
            cleaned.length == 10 -> "${cleaned.substring(0, 4)} ${cleaned.substring(4, 7)} ${cleaned.substring(7)}"
            else -> phone
        }
    }

    fun validateCheckoutData(
        name: String,
        phone: String,
        address: String
    ): ValidationResult {
        return when {
            !isValidName(name) -> ValidationResult.Error("Tên không hợp lệ (tối thiểu 2 ký tự)")
            !isValidPhone(phone) -> ValidationResult.Error("Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)")
            !isValidAddress(address) -> ValidationResult.Error("Địa chỉ không hợp lệ (tối thiểu 10 ký tự)")
            else -> ValidationResult.Success
        }
    }

    sealed class ValidationResult {
        object Success : ValidationResult()
        data class Error(val message: String) : ValidationResult()
    }
}
