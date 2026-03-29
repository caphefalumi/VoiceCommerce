package com.tgdd.app.ui.utils

import android.view.View
import android.view.animation.AnimationUtils
import com.tgdd.app.R

/**
 * Extension functions for common View operations
 */

fun View.fadeIn(duration: Long = 200) {
    if (visibility == View.VISIBLE) return
    val animation = AnimationUtils.loadAnimation(context, R.anim.fade_in)
    animation.duration = duration
    visibility = View.VISIBLE
    startAnimation(animation)
}

fun View.fadeOut(duration: Long = 150) {
    if (visibility != View.VISIBLE) return
    val animation = AnimationUtils.loadAnimation(context, R.anim.fade_out)
    animation.duration = duration
    startAnimation(animation)
    visibility = View.GONE
}

fun View.show() {
    visibility = View.VISIBLE
}

fun View.hide() {
    visibility = View.GONE
}

fun View.invisible() {
    visibility = View.INVISIBLE
}

fun View.isVisible(): Boolean = visibility == View.VISIBLE

fun View.isGone(): Boolean = visibility == View.GONE

fun View.toggleVisibility() {
    visibility = if (visibility == View.VISIBLE) View.GONE else View.VISIBLE
}
