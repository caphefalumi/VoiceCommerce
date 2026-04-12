package com.tgdd.app.ui.auth

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import com.tgdd.app.R
import com.tgdd.app.databinding.FragmentRegisterBinding
import dagger.hilt.android.AndroidEntryPoint

/**
 * Fragment for new user registration with name, email, and password.
 * 
 * Navigation:
 * - FROM: LoginFragment
 * - TO: LoginFragment (on success, clears backstack)
 * 
 * Arguments:
 * - None
 * 
 * Results:
 * - None (pops to LoginFragment on success)
 * 
 * @see AuthViewModel For registration state management
 */
@AndroidEntryPoint
class RegisterFragment : Fragment() {

    private var _binding: FragmentRegisterBinding? = null
    private val binding get() = _binding!!
    private val viewModel: AuthViewModel by viewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentRegisterBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.closeButton.setOnClickListener { findNavController().navigateUp() }

        binding.registerButton.setOnClickListener {
            val name = binding.nameInput.text?.toString()?.trim() ?: ""
            val email = binding.emailInput.text?.toString()?.trim() ?: ""
            val password = binding.passwordInput.text?.toString() ?: ""

            binding.nameLayout.error = null
            binding.emailLayout.error = null
            binding.passwordLayout.error = null

            var valid = true
            if (name.isBlank()) { binding.nameLayout.error = "Vui lòng nhập họ tên"; valid = false }
            if (email.isBlank()) { binding.emailLayout.error = "Vui lòng nhập email"; valid = false }
            if (password.length < 6) { binding.passwordLayout.error = "Mật khẩu phải có ít nhất 6 ký tự"; valid = false }
            if (valid) viewModel.registerWithEmailPassword(name, email, password)
        }

        binding.loginLink.setOnClickListener {
            findNavController().navigateUp()
        }

        viewModel.isLoading.observe(viewLifecycleOwner) { loading ->
            binding.registerButton.isEnabled = !loading
            binding.registerButton.text = if (loading) "" else "Đăng ký"
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

        viewModel.loginSuccess.observe(viewLifecycleOwner) { event ->
            event.getContentIfNotHandled()?.let {
                // pop back to login screen and clear backstack
                findNavController().popBackStack(R.id.loginFragment, true)
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
