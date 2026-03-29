package com.tgdd.app.ui.auth

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import com.tgdd.app.R
import com.tgdd.app.databinding.FragmentLoginBinding
import dagger.hilt.android.AndroidEntryPoint

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

        viewModel.isLoading.observe(viewLifecycleOwner) { loading ->
            binding.loginButton.isEnabled = !loading
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

        viewModel.loginSuccess.observe(viewLifecycleOwner) { success ->
            if (success) {
                viewModel.resetLoginSuccess()
                findNavController().navigateUp()
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
