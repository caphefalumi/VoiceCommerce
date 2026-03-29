package com.tgdd.app

import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.navigation.NavController
import androidx.navigation.fragment.NavHostFragment
import androidx.navigation.ui.setupWithNavController
import com.google.android.material.snackbar.Snackbar
import com.tgdd.app.databinding.ActivityMainBinding
import com.tgdd.app.data.network.AuthEvents
import com.tgdd.app.data.network.NetworkObserver
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding
    private lateinit var navController: NavController
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        NetworkObserver.init(this)
        setupNavigation()
        observeAuthErrors()
    }
    
    override fun onResume() {
        super.onResume()
        NetworkObserver.isConnected?.observe(this) { connected ->
            if (!connected) {
                showNetworkErrorSnackbar()
            }
        }
    }
    
    private fun showNetworkErrorSnackbar() {
        Snackbar.make(
            binding.root,
            getString(R.string.error_network),
            Snackbar.LENGTH_INDEFINITE
        ).setAction(getString(R.string.retry)) {
            // Retry last action
        }.show()
    }
    
    private fun observeAuthErrors() {
        AuthEvents.authError.observe(this) { error ->
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
            R.id.forgotPasswordFragment
        )
        navController.addOnDestinationChangedListener { _, destination, _ ->
            binding.bottomNavigation.visibility =
                if (destination.id in authDestinations) View.GONE else View.VISIBLE
        }
    }
    
    override fun onSupportNavigateUp(): Boolean {
        return navController.navigateUp() || super.onSupportNavigateUp()
    }
}
