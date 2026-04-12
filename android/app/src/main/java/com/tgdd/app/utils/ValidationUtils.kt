package com.tgdd.app.utils

import android.util.Patterns

/**
 * Utility object for common validation operations in the app.
 * Provides validation methods for user input data like email, phone, address, etc.
 */
object ValidationUtils {
    
    /**
     * Validates an email address using Android's built-in EMAIL_ADDRESS pattern.
     * 
     * @param email The email string to validate
     * @return true if the email is valid, false otherwise
     * @throws IllegalArgumentException if email is null (note: Kotlin's null safety handles this gracefully)
     * 
     * @example
     * ```
     * isValidEmail("user@example.com")  // true
     * isValidEmail("invalid-email")   // false
     * isValidEmail("")             // false
     * ```
     * 
     * @see Patterns.EMAIL_ADDRESS
     */
    fun isValidEmail(email: String): Boolean {
        return email.isNotBlank() && Patterns.EMAIL_ADDRESS.matcher(email).matches()
    }

    /**
     * Validates a Vietnamese phone number.
     * 
     * Pattern: 10 digits starting with 0 (e.g., 0912345678)
     * @param phone The phone number string to validate
     * @return true if valid, false otherwise
     * 
     * @example
     * ```
     * isValidPhone("0912345678")  // true
     * isValidPhone("0123456789")  // true
     * isValidPhone("9123456789")  // false (missing leading 0)
     * isValidPhone("091234567")    // false (only 9 digits)
     * ```
     * 
     * Regex pattern: ^0[0-9]{9}$
     * - ^0: Must start with 0
     * - [0-9]{9}: Followed by exactly 9 digits (total 10 digits)
     * - $: End of string
     */
    fun isValidPhone(phone: String): Boolean {
        // Vietnamese phone number: 10 digits starting with 0
        val phonePattern = "^0[0-9]{9}$".toRegex()
        return phone.matches(phonePattern)
    }

    /**
     * Validates a delivery address.
     * 
     * @param address The address string to validate
     * @return true if address is valid (not blank and >= 10 characters), false otherwise
     * 
     * @example
     * ```
     * isValidAddress("123 Nguyễn Trãi, Quận 1, TP.HCM")  // true
     * isValidAddress("Hồ Chí Minh")                     // false (< 10 chars)
     * isValidAddress("")                               // false
     * ```
     * 
     * Note: The 10 character minimum is to ensure meaningful delivery instructions
     */
    fun isValidAddress(address: String): Boolean {
        return address.isNotBlank() && address.length >= 10
    }

    /**
     * Validates a person's name.
     * 
     * @param name The name string to validate
     * @return true if name is valid (not blank and >= 2 characters), false otherwise
     * 
     * @example
     * ```
     * isValidName("John Doe")     // true
     * isValidName("Trần")      // false (< 2 chars)
     * isValidName("")          // false
     * ```
     */
    fun isValidName(name: String): Boolean {
        return name.isNotBlank() && name.length >= 2
    }

    /**
     * Validates a password meets minimum security requirements.
     * 
     * @param password The password string to validate
     * @return true if password is valid (>= 6 characters), false otherwise
     * 
     * @example
     * ```
     * isValidPassword("123456")    // true
     * isValidPassword("abc")      // false (< 6 chars)
     * ```
     * 
     * Note: This is a basic validation. Consider adding upper/lower case, 
     * numbers, and special characters for stronger validation in production.
     */
    fun isValidPassword(password: String): Boolean {
        return password.length >= 6
    }

    /**
     * Formats a Vietnamese phone number for display.
     * Format: XXXX XXX XXX (e.g., 0912 345 678)
     * 
     * @param phone The phone number to format (can contain non-digit characters)
     * @return Formatted phone number with spaces, or original if not 10 digits
     * 
     * @example
     * ```
     * formatPhoneNumber("0912345678")  // "0912 345 678"
     * formatPhoneNumber("0912-345-678") // "0912 345 678"
     * formatPhoneNumber("12345")        // "12345" (unchanged, not 10 digits)
     * ```
     */
    fun formatPhoneNumber(phone: String): String {
        // Remove all non-digit characters first
        val cleaned = phone.replace(Regex("[^0-9]"), "")
        return when {
            // If exactly 10 digits, format as "0912 345 678"
            cleaned.length == 10 -> "${cleaned.substring(0, 4)} ${cleaned.substring(4, 7)} ${cleaned.substring(7)}"
            // Otherwise return original
            else -> phone
        }
    }

    /**
     * Validates all checkout required data in one call.
     * 
     * @param name Customer's name
     * @param phone Customer's phone number
     * @param address Delivery address
     * @return ValidationResult.Success if all valid, ValidationResult.Error with message otherwise
     * 
     * @example
     * ```
     * val result = validateCheckoutData("John", "0912345678", "123 Main St")
     * when (result) {
     *     is ValidationResult.Success -> proceedToCheckout()
     *     is ValidationResult.Error -> showError(result.message)
     * }
     * ```
     */
    fun validateCheckoutData(
        name: String,
        phone: String,
        address: String
    ): ValidationResult {
        return when {
            // Validate name: minimum 2 characters
            !isValidName(name) -> ValidationResult.Error("Tên không hợp lệ (tối thiểu 2 ký tự)")
            // Validate phone: 10 digits starting with 0
            !isValidPhone(phone) -> ValidationResult.Error("Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)")
            // Validate address: minimum 10 characters
            !isValidAddress(address) -> ValidationResult.Error("Địa chỉ không hợp lệ (tối thiểu 10 ký tự)")
            // All valid
            else -> ValidationResult.Success
        }
    }

    /**
     * Represents the result of a validation operation.
     * 
     * Use sealed class pattern to handle validation results safely:
     * - Success: Validation passed
     * - Error: Validation failed with error message
     */
    sealed class ValidationResult {
        /** Validation passed successfully */
        object Success : ValidationResult()
        
        /** Validation failed with error message */
        data class Error(val message: String) : ValidationResult()
    }
}