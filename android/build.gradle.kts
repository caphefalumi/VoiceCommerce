// Top-level build file where you can add configuration options common to all sub-projects/modules.
plugins {
    id("com.android.application") version "8.13.2" apply false
    id("org.jetbrains.kotlin.android") version "1.9.22" apply false
    id("com.google.devtools.ksp") version "1.9.22-1.0.17" apply false
    id("com.google.dagger.hilt.android") version "2.50" apply false
    id("androidx.navigation.safeargs.kotlin") version "2.7.6" apply false
}

ext {
    set("kotlin_version", "1.9.22")
    set("compose_version", "1.5.8")
    set("room_version", "2.6.1")
    set("lifecycle_version", "2.7.0")
    set("nav_version", "2.7.6")
    set("hilt_version", "2.50")
    set("retrofit_version", "2.9.0")
    set("okhttp_version", "4.12.0")
    set("coroutines_version", "1.7.3")
    set("glide_version", "4.16.0")
}
