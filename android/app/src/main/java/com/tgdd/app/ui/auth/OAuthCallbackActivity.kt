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
            val intent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                putExtra("oauth_error", error)
            }
            startActivity(intent)
            finish()
            return
        }

        // OAuth callback - fetch session from the cookie set by better-auth
        lifecycleScope.launch {
            val result = userRepository.refreshSession()
            result.fold(
                onSuccess = {
                    val intent = Intent(this@OAuthCallbackActivity, MainActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                    }
                    startActivity(intent)
                    finish()
                },
                onFailure = { e ->
                    Snackbar.make(
                        window.decorView,
                        e.message ?: getString(R.string.error_generic),
                        Snackbar.LENGTH_LONG
                    ).show()
                    val intent = Intent(this@OAuthCallbackActivity, MainActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                        putExtra("oauth_error", e.message)
                    }
                    startActivity(intent)
                    finish()
                }
            )
        }
    }
}
