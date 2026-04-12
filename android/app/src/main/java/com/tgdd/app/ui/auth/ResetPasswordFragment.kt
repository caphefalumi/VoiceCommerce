package com.tgdd.app.ui.auth

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import com.tgdd.app.R
import com.tgdd.app.databinding.FragmentResetPasswordBinding
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class ResetPasswordFragment : Fragment() {

    private var _binding: FragmentResetPasswordBinding? = null
    private val binding get() = _binding!!
    private val viewModel: ResetPasswordViewModel by viewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentResetPasswordBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.backButton.setOnClickListener { findNavController().navigateUp() }

        binding.resetButton.setOnClickListener {
            val token = arguments?.getString("token") ?: ""
            val password = binding.passwordInput.text?.toString() ?: ""
            val confirmPassword = binding.confirmPasswordInput.text?.toString() ?: ""

            binding.passwordLayout.error = null
            binding.confirmPasswordLayout.error = null

            var valid = true
            if (password.isBlank()) {
                binding.passwordLayout.error = getString(R.string.reset_password_required)
                valid = false
            }
            if (confirmPassword.isBlank()) {
                binding.confirmPasswordLayout.error = getString(R.string.confirm_password_required)
                valid = false
            }
            if (valid) viewModel.resetPassword(token, password, confirmPassword)
        }

        viewModel.isLoading.observe(viewLifecycleOwner) { loading ->
            binding.resetButton.isEnabled = !loading
            binding.resetButton.text = if (loading) "" else getString(R.string.reset_password_button)
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

        viewModel.resetSuccess.observe(viewLifecycleOwner) { success ->
            if (success) {
                binding.successCard.visibility = View.VISIBLE
                binding.resetButton.visibility = View.GONE
                Handler(Looper.getMainLooper()).postDelayed({
                    findNavController().navigate(R.id.loginFragment)
                }, 2500)
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
