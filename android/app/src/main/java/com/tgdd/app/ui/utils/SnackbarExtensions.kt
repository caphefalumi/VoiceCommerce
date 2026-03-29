package com.tgdd.app.ui.utils

import android.view.View
import androidx.core.content.ContextCompat
import com.google.android.material.snackbar.Snackbar
import com.tgdd.app.R

/**
 * Extension functions for showing styled Snackbars with consistent UX
 */

fun View.showSuccessSnackbar(message: String, duration: Int = Snackbar.LENGTH_SHORT) {
    Snackbar.make(this, message, duration)
        .setBackgroundTint(ContextCompat.getColor(context, R.color.mobi_pulse_primary))
        .setTextColor(ContextCompat.getColor(context, android.R.color.black))
        .setActionTextColor(ContextCompat.getColor(context, R.color.mobi_pulse_primary_dark))
        .show()
}

fun View.showErrorSnackbar(
    message: String,
    actionText: String = "Thử lại",
    duration: Int = Snackbar.LENGTH_LONG,
    action: (() -> Unit)? = null
) {
    val snackbar = Snackbar.make(this, message, duration)
        .setBackgroundTint(ContextCompat.getColor(context, R.color.mobi_pulse_tertiary))
        .setTextColor(ContextCompat.getColor(context, android.R.color.white))
        .setActionTextColor(ContextCompat.getColor(context, android.R.color.white))
    
    if (action != null) {
        snackbar.setAction(actionText) { action() }
    }
    
    snackbar.show()
}

fun View.showInfoSnackbar(message: String, duration: Int = Snackbar.LENGTH_SHORT) {
    Snackbar.make(this, message, duration)
        .setBackgroundTint(ContextCompat.getColor(context, R.color.mobi_pulse_secondary))
        .setTextColor(ContextCompat.getColor(context, android.R.color.white))
        .show()
}
