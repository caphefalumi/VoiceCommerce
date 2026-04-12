package com.tgdd.app

import android.content.Context
import android.net.Uri
import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.navigation.NavController
import androidx.navigation.fragment.NavHostFragment
import androidx.navigation.ui.setupWithNavController
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.snackbar.Snackbar
import com.tgdd.app.databinding.ActivityMainBinding
import com.tgdd.app.data.network.AuthEvents
import com.tgdd.app.data.network.NetworkObserver
import com.tgdd.app.data.remote.OrderApi
import com.tgdd.app.util.LocaleHelper
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding
    private lateinit var navController: NavController
    
    @Inject
    lateinit var orderApi: OrderApi
    
    private val networkObserver = androidx.lifecycle.Observer<Boolean> { connected ->
        if (!connected) showNetworkErrorSnackbar()
        else currentNetworkSnackbar?.dismiss()
    }

    private var currentNetworkSnackbar: Snackbar? = null
    
    private val authObserver = androidx.lifecycle.Observer<String?> { error ->
        error?.let {
            Snackbar.make(
                binding.root,
                it,
                Snackbar.LENGTH_LONG
            ).setAction(getString(R.string.login)) {
                navController.navigate(R.id.profileFragment)
            }.show()
            AuthEvents.clearAuthError()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        NetworkObserver.init(this)
        setupNavigation()
        observeAuthErrors()
        NetworkObserver.isConnected?.observe(this, networkObserver)
        
        handleDeepLink()
    }
    
    override fun attachBaseContext(newBase: Context) {
        super.attachBaseContext(LocaleHelper.setLocale(newBase, LocaleHelper.getLanguage(newBase)))
    }
    
    override fun onNewIntent(intent: android.content.Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleDeepLink()
    }
    
    private fun handleDeepLink() {
        intent?.data?.let { uri ->
            if (uri.scheme == "tgdd" && uri.host == "reset-password") {
                val token = uri.getQueryParameter("token")
                if (!token.isNullOrBlank()) {
                    val bundle = Bundle().apply {
                        putString("token", token)
                    }
                    navController.navigate(R.id.resetPasswordFragment, bundle)
                }
            } else if (uri.scheme == "tgdd" && uri.host == "verify-email") {
                val token = uri.getQueryParameter("token")
                if (!token.isNullOrBlank()) {
                    val bundle = Bundle().apply {
                        putString("token", token)
                    }
                    navController.navigate(R.id.verifyEmailFragment, bundle)
                }
            } else if (uri.scheme == "tgdd" && uri.host == "checkout") {
                val sessionId = uri.getQueryParameter("session_id")
                if (!sessionId.isNullOrBlank()) {
                    verifyAndShowPaymentResult(sessionId)
                }
            } else if (uri.scheme == "tgdd" && uri.host == "oauth") {
                startActivity(android.content.Intent(this, com.tgdd.app.ui.auth.OAuthCallbackActivity::class.java).apply {
                    data = uri
                })
            }
        }
    }
    
    private fun verifyAndShowPaymentResult(sessionId: String) {
        lifecycleScope.launch {
            try {
                val response = orderApi.getPaymentStatus(sessionId)
                if (response.isSuccessful) {
                    val status = response.body()?.status
                    when (status) {
                        "paid" -> {
                            MaterialAlertDialogBuilder(this@MainActivity)
                                .setTitle(getString(R.string.payment_success_title))
                                .setMessage(getString(R.string.payment_success_message))
                                .setPositiveButton(getString(R.string.ok)) { _, _ ->
                                    navController.navigate(R.id.productListFragment)
                                }
                                .setCancelable(false)
                                .show()
                        }
                        "canceled" -> {
                            Snackbar.make(
                                binding.root,
                                getString(R.string.payment_canceled),
                                Snackbar.LENGTH_LONG
                            ).show()
                        }
                        else -> {
                            Snackbar.make(
                                binding.root,
                                getString(R.string.payment_pending),
                                Snackbar.LENGTH_LONG
                            ).show()
                        }
                    }
                } else {
                    Snackbar.make(
                        binding.root,
                        getString(R.string.payment_check_failed),
                        Snackbar.LENGTH_LONG
                    ).show()
                }
            } catch (e: Exception) {
                Snackbar.make(
                    binding.root,
                    getString(R.string.payment_check_failed),
                    Snackbar.LENGTH_LONG
                ).show()
            }
        }
    }
    
    override fun onResume() {
        super.onResume()
    }
    
    private fun showNetworkErrorSnackbar() {
        if (currentNetworkSnackbar?.isShown == true) return

        currentNetworkSnackbar = Snackbar.make(
            binding.root,
            getString(R.string.error_network),
            Snackbar.LENGTH_INDEFINITE
        ).setAction(getString(R.string.retry)) {
            // Retry last action
        }

        currentNetworkSnackbar?.show()
    }
    
    private fun observeAuthErrors() {
        AuthEvents.authError.observe(this, authObserver)
        
        // Check for OAuth error passed via intent
        intent?.getStringExtra("oauth_error")?.let { error ->
            Snackbar.make(
                binding.root,
                error.ifBlank { getString(R.string.oauth_error_title) },
                Snackbar.LENGTH_LONG
            ).show()
        }
    }
    
    private fun setupNavigation() {
        val navHostFragment = supportFragmentManager
            .findFragmentById(R.id.nav_host_fragment) as NavHostFragment
        navController = navHostFragment.navController
        
        binding.bottomNavigation.setupWithNavController(navController)

        // Hide bottom nav on auth screens
        val authDestinations = setOf(
            R.id.loginFragment,
            R.id.registerFragment,
            R.id.forgotPasswordFragment,
            R.id.resetPasswordFragment,
            R.id.verifyEmailFragment
        )
        navController.addOnDestinationChangedListener { _, destination, _ ->
            binding.bottomNavigation.visibility =
                if (destination.id in authDestinations) View.GONE else View.VISIBLE
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        // CRITICAL: Remove observers to prevent memory leak
        // The observers are bound to 'this' Activity lifecycle, so we must clean up
        NetworkObserver.isConnected?.removeObserver(networkObserver)
        AuthEvents.authError.removeObserver(authObserver)
    }
    
    override fun onSupportNavigateUp(): Boolean {
        return navController.navigateUp() || super.onSupportNavigateUp()
    }
}
