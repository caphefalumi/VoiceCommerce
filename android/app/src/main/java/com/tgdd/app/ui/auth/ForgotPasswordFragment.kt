package com.tgdd.app.ui.auth

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import com.tgdd.app.databinding.FragmentForgotPasswordBinding
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class ForgotPasswordFragment : Fragment() {

    private var _binding: FragmentForgotPasswordBinding? = null
    private val binding get() = _binding!!
    private val viewModel: ForgotPasswordViewModel by viewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentForgotPasswordBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.closeButton.setOnClickListener { findNavController().navigateUp() }

        binding.sendButton.setOnClickListener {
            val email = binding.emailInput.text?.toString()?.trim() ?: ""
            binding.emailLayout.error = null
            if (email.isBlank()) {
                binding.emailLayout.error = "Vui lòng nhập email"
                return@setOnClickListener
            }
            viewModel.sendReset(email)
        }

        viewModel.isLoading.observe(viewLifecycleOwner) { loading ->
            binding.sendButton.isEnabled = !loading
            binding.progressBar.visibility = if (loading) View.VISIBLE else View.GONE
        }

        viewModel.success.observe(viewLifecycleOwner) { success ->
            if (success) {
                binding.successCard.visibility = View.VISIBLE
                binding.sendButton.isEnabled = false
                binding.emailLayout.isEnabled = false
            }
        }

        viewModel.error.observe(viewLifecycleOwner) { error ->
            if (error != null) {
                binding.errorCard.visibility = View.VISIBLE
                binding.errorText.text = error
            } else {
                binding.errorCard.visibility = View.GONE
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
