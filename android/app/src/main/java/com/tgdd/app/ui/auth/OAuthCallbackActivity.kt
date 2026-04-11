package com.tgdd.app.ui.auth

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.material.snackbar.Snackbar
import com.tgdd.app.MainActivity
import com.tgdd.app.R
import com.tgdd.app.data.repository.UserRepository
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class OAuthCallbackActivity : AppCompatActivity() {

    @Inject
    lateinit var userRepository: UserRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val uri = intent.data
        if (uri == null) {
            finish()
            return
        }

        // Check for error in OAuth callback
        val error = uri.getQueryParameter("error")
        if (error != null) {
            goToMain(oauthError = error)
            return
        }

        // Extract the OAuth code + state Better Auth passes back in the redirect URI.
        val code  = uri.getQueryParameter("code")
        val state = uri.getQueryParameter("state")

        lifecycleScope.launch {
            val result = if (!code.isNullOrBlank() && !state.isNullOrBlank()) {
                // Happy path: exchange code+state for a Bearer token via the
                // mobile callback helper endpoint (no cookie required).
                userRepository.handleGoogleCallback(code, state)
            } else {
                // Fallback for other OAuth flows that rely on a server-side cookie.
                userRepository.refreshSession()
            }

            result.fold(
                onSuccess = { goToMain() },
                onFailure = { e ->
                    Snackbar.make(
                        window.decorView,
                        e.message ?: getString(R.string.error_generic),
                        Snackbar.LENGTH_LONG
                    ).show()
                    goToMain(oauthError = e.message)
                }
            )
        }
    }

    private fun goToMain(oauthError: String? = null) {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            if (oauthError != null) putExtra("oauth_error", oauthError)
        }
        startActivity(intent)
        finish()
    }
}
