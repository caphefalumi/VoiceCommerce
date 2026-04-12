package com.tgdd.app.ui.auth

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.activity.result.contract.ActivityResultContracts
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import com.tgdd.app.R
import com.tgdd.app.data.auth.FirebaseAuthHelper
import com.tgdd.app.databinding.FragmentLoginBinding
import com.google.android.material.snackbar.Snackbar
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

/**
 * Fragment for user authentication with email/password and Google Sign-In.
 * 
 * Navigation:
 * - FROM: RegisterFragment, main screen (global action)
 * - TO: RegisterFragment (register link), ForgotPasswordFragment (forgot password link)
 * 
 * Arguments:
 * - None
 * 
 * Results:
 * - None (navigates up on success, stays on screen on error)
 * 
 * @see AuthViewModel For authentication state management
 */
@AndroidEntryPoint
class LoginFragment : Fragment() {

    private var _binding: FragmentLoginBinding? = null
    private val binding get() = _binding!!
    private val viewModel: AuthViewModel by viewModels()
    
    private lateinit var firebaseAuthHelper: FirebaseAuthHelper
    
    private val firebaseSignInLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == android.app.Activity.RESULT_OK) {
            lifecycleScope.launch {
                val data = result.data
                val tokenResult = firebaseAuthHelper.handleSignInResult(data)
                tokenResult.fold(
                    onSuccess = { idToken ->
                        viewModel.onFirebaseGoogleSignIn(idToken)
                    },
                    onFailure = { error ->
                        binding.btnFirebaseGoogleSignIn.isEnabled = true
                        Snackbar.make(
                            binding.root,
                            getString(R.string.login_failed_prefix, error.message ?: getString(R.string.error_generic)),
                            Snackbar.LENGTH_LONG
                        ).show()
                    }
                )
            }
        } else {
            Snackbar.make(binding.root, getString(R.string.google_login_cancelled), Snackbar.LENGTH_SHORT).show()
            binding.btnFirebaseGoogleSignIn.isEnabled = true
        }
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentLoginBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        firebaseAuthHelper = FirebaseAuthHelper(requireActivity())

        binding.closeButton.setOnClickListener { findNavController().navigateUp() }

        binding.loginButton.setOnClickListener {
            val email = binding.emailInput.text?.toString()?.trim() ?: ""
            val password = binding.passwordInput.text?.toString() ?: ""

            binding.emailLayout.error = null
            binding.passwordLayout.error = null

            var valid = true
            if (email.isBlank()) {
                binding.emailLayout.error = getString(R.string.login_email_required)
                valid = false
            }
            if (password.isBlank()) {
                binding.passwordLayout.error = getString(R.string.login_password_required)
                valid = false
            }
            if (valid) viewModel.signInWithEmailPassword(email, password)
        }

        binding.forgotPasswordText.setOnClickListener {
            findNavController().navigate(R.id.action_login_to_forgotPassword)
        }

        binding.registerLink.setOnClickListener {
            findNavController().navigate(R.id.action_login_to_register)
        }

        binding.btnFirebaseGoogleSignIn.setOnClickListener {
            binding.btnFirebaseGoogleSignIn.isEnabled = false
            val signInIntent = firebaseAuthHelper.getSignInIntent()
            firebaseSignInLauncher.launch(signInIntent)
        }

        viewModel.isLoading.observe(viewLifecycleOwner) { loading ->
            binding.loginButton.isEnabled = !loading
            binding.btnFirebaseGoogleSignIn.isEnabled = !loading
            binding.loginButton.text = if (loading) "" else getString(R.string.login_button)
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
                findNavController().navigateUp()
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
