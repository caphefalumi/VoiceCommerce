// Top-level build file where you can add configuration options common to all sub-projects/modules.
plugins {
    id("com.android.application") version "8.13.2" apply false
    id("org.jetbrains.kotlin.android") version "2.1.0" apply false
    id("com.google.devtools.ksp") version "2.1.0-1.0.29" apply false
    id("com.google.dagger.hilt.android") version "2.54" apply false
    id("androidx.navigation.safeargs.kotlin") version "2.8.5" apply false
    id("com.google.gms.google-services") version "4.4.4" apply false
}

ext {
    set("kotlin_version", "2.1.0")
    set("compose_version", "1.5.8")
    set("room_version", "2.6.1")
    set("lifecycle_version", "2.7.0")
    set("nav_version", "2.7.6")
    set("hilt_version", "2.54")
    set("retrofit_version", "2.11.0")
    set("okhttp_version", "4.12.0")
    set("coroutines_version", "1.8.1")
    set("glide_version", "4.16.0")
}
