package com.tgdd.app

import android.app.Application
import com.tgdd.app.data.crash.CrashReporter
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class MyApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        
        CrashReporter.logInfo("Application started - ${BuildConfig.VERSION_NAME} (${BuildConfig.BUILD_TYPE})")
    }
}
