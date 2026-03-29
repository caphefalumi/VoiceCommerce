package com.tgdd.app.data.crash

import android.util.Log
import java.io.PrintWriter
import java.io.StringWriter

/**
 * Local crash reporter that logs exceptions to Logcat.
 * 
 * This provides basic crash reporting without requiring Firebase setup.
 * For production, consider integrating with Firebase Crashlytics or
 * a similar crash reporting service.
 */
object CrashReporter {
    private const val TAG = "CrashReporter"
    
    /**
     * Log an exception with its stack trace to Logcat.
     * 
     * @param throwable The exception to log
     * @param context Optional context string describing where the error occurred
     */
    fun logException(throwable: Throwable, context: String = "") {
        val sw = StringWriter()
        throwable.printStackTrace(PrintWriter(sw))
        val stackTrace = sw.toString()
        
        Log.e(TAG, "=== CRASH REPORT ===")
        if (context.isNotEmpty()) {
            Log.e(TAG, "Context: $context")
        }
        Log.e(TAG, "Message: ${throwable.message}")
        Log.e(TAG, "StackTrace: $stackTrace")
        Log.e(TAG, "===================")
        
        // TODO: Send to crash reporting service (e.g., Firebase Crashlytics, Sentry, etc.)
    }
    
    /**
     * Log a debug message.
     * 
     * @param message The message to log
     */
    fun log(message: String) {
        Log.d(TAG, message)
    }
    
    /**
     * Log an info message.
     * 
     * @param message The message to log
     */
    fun logInfo(message: String) {
        Log.i(TAG, message)
    }
    
    /**
     * Log a warning message.
     * 
     * @param message The message to log
     */
    fun logWarning(message: String) {
        Log.w(TAG, message)
    }
}
