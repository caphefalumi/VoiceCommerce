package com.tgdd.app.ui.auth

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.browser.customtabs.CustomTabsIntent
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import com.tgdd.app.R
import com.tgdd.app.databinding.FragmentLoginBinding
import com.google.android.material.snackbar.Snackbar
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

@AndroidEntryPoint
class LoginFragment : Fragment() {

    private var _binding: FragmentLoginBinding? = null
    private val binding get() = _binding!!
    private val viewModel: AuthViewModel by viewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentLoginBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.closeButton.setOnClickListener { findNavController().navigateUp() }

        binding.loginButton.setOnClickListener {
            val email = binding.emailInput.text?.toString()?.trim() ?: ""
            val password = binding.passwordInput.text?.toString() ?: ""

            binding.emailLayout.error = null
            binding.passwordLayout.error = null

            var valid = true
            if (email.isBlank()) {
                binding.emailLayout.error = "Vui lòng nhập email"
                valid = false
            }
            if (password.isBlank()) {
                binding.passwordLayout.error = "Vui lòng nhập mật khẩu"
                valid = false
            }
            if (valid) viewModel.login(email, password)
        }

        binding.forgotPasswordText.setOnClickListener {
            findNavController().navigate(R.id.action_login_to_forgotPassword)
        }

        binding.registerLink.setOnClickListener {
            findNavController().navigate(R.id.action_login_to_register)
        }

        // Google Sign-In button
        binding.btnGoogleSignIn.setOnClickListener {
            lifecycleScope.launch {
                binding.btnGoogleSignIn.isEnabled = false
                val result = viewModel.getGoogleSignInUrl()
                result.fold(
                    onSuccess = { url ->
                        openCustomTab(url)
                    },
                    onFailure = { e ->
                        Snackbar.make(
                            binding.root,
                            e.message ?: "Không thể mở đăng nhập Google",
                            Snackbar.LENGTH_SHORT
                        ).show()
                    }
                )
                binding.btnGoogleSignIn.isEnabled = true
            }
        }

        viewModel.isLoading.observe(viewLifecycleOwner) { loading ->
            binding.loginButton.isEnabled = !loading
            binding.btnGoogleSignIn.isEnabled = !loading
            binding.loginButton.text = if (loading) "" else "Đăng nhập"
            binding.progressBar.visibility = if (loading) View.VISIBLE else View.GONE
        }

        viewModel.error.observe(viewLifecycleOwner) { error ->
            if (error != null) {
                binding.errorCard.visibility = View.VISIBLE
                binding.errorText.text = error
                viewModel.clearError()
            } else {
                binding.errorCard.visibility = View.GONE
            }
        }

        // SingleEvent pattern - only navigate once
        viewModel.loginSuccess.observe(viewLifecycleOwner) { event ->
            event.getContentIfNotHandled()?.let {
                viewModel.resetLoginSuccess()
                findNavController().navigateUp()
            }
        }
    }

    private fun openCustomTab(url: String) {
        try {
            val customTabsIntent = CustomTabsIntent.Builder()
                .setShowTitle(false)
                .build()
            customTabsIntent.launchUrl(requireContext(), Uri.parse(url))
        } catch (e: Exception) {
            // Fallback to regular browser
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            startActivity(intent)
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
