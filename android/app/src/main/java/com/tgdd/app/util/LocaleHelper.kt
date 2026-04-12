package com.tgdd.app.util

import android.content.Context
import android.content.res.Configuration
import android.os.Build
import java.util.Locale

/**
 * Helper for managing app locale (language) settings.
 * Supports Vietnamese (vi) and English (en).
 * Persists selection to SharedPreferences.
 */
object LocaleHelper {
    private const val SELECTED_LANGUAGE = "selected_language"
    private const val LANGUAGE_VI = "vi"
    private const val LANGUAGE_EN = "en"

    /**
     * Sets app locale and returns configured context.
     * 
     * @param context Base context
     * @param language Language code ("vi" or "en")
     * @return Context with locale configuration applied
     * 
     * @example
     * ```
     * val context = LocaleHelper.setLocale(context, "vi")
     * // Use context for activity recreation
     * ```
     * 
     * Edge cases:
     * - Unknown language: falls back to "vi"
     * - Android N+: uses createConfigurationContext
     * - Older Android: uses deprecated updateConfiguration
     * - RTL languages: sets layout direction
     * 
     * Note: Call attachBaseContext() in Application or Activity base class
     */
    fun setLocale(context: Context, language: String): Context {
        persist(context, language)

        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            updateResources(context, language)
        } else {
            updateResourcesLegacy(context, language)
        }
    }

    /**
     * Gets current language setting.
     * 
     * @param context Context to read preferences
     * @return Language code (default "vi")
     */
    fun getLanguage(context: Context): String {
        val prefs = context.getSharedPreferences("app_prefs", Context.MODE_PRIVATE)
        return prefs.getString(SELECTED_LANGUAGE, LANGUAGE_VI) ?: LANGUAGE_VI
    }

    /**
     * Saves language preference.
     */
    private fun persist(context: Context, language: String) {
        val prefs = context.getSharedPreferences("app_prefs", Context.MODE_PRIVATE)
        prefs.edit().putString(SELECTED_LANGUAGE, language).apply()
    }

    /**
     * Updates resources for Android N+.
     * Uses createConfigurationContext for locale change.
     */
    private fun updateResources(context: Context, language: String): Context {
        val locale = Locale(language)
        Locale.setDefault(locale)

        val configuration = Configuration(context.resources.configuration)
        configuration.setLocale(locale)
        configuration.setLayoutDirection(locale)

        return context.createConfigurationContext(configuration)
    }

    /**
     * Updates resources for older Android versions.
     * Uses deprecated updateConfiguration.
     */
    @Suppress("DEPRECATION")
    private fun updateResourcesLegacy(context: Context, language: String): Context {
        val locale = Locale(language)
        Locale.setDefault(locale)

        val resources = context.resources
        val configuration = resources.configuration
        configuration.locale = locale
        configuration.setLayoutDirection(locale)

        resources.updateConfiguration(configuration, resources.displayMetrics)

        return context
    }

    /**
     * Checks if currently Vietnamese locale.
     * 
     * @param context Context to check
     * @return true if Vietnamese, false if English
     */
    fun isVietnamese(context: Context): Boolean {
        return getLanguage(context) == LANGUAGE_VI
    }

    /**
     * Toggles between Vietnamese and English.
     * 
     * @param context Context for persistence
     * @return New language code after toggle
     * 
     * @example
     * ```
     * val newLang = LocaleHelper.toggleLanguage(context)
     * // Recreate activity to apply new locale
     * ```
     */
    fun toggleLanguage(context: Context): String {
        val currentLanguage = getLanguage(context)
        val newLanguage = if (currentLanguage == LANGUAGE_VI) LANGUAGE_EN else LANGUAGE_VI
        setLocale(context, newLanguage)
        return newLanguage
    }
}