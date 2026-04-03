package com.tgdd.app.ui.profile

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import com.tgdd.app.databinding.FragmentAccountSettingsBinding
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class AccountSettingsFragment : Fragment() {

    private var _binding: FragmentAccountSettingsBinding? = null
    private val binding get() = _binding!!
    private val viewModel: ProfileViewModel by viewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentAccountSettingsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.toolbar.setNavigationOnClickListener { findNavController().navigateUp() }

        binding.saveButton.setOnClickListener {
            val name = binding.nameInput.text?.toString()?.trim() ?: ""
            binding.nameLayout.error = null
            if (name.isBlank()) {
                binding.nameLayout.error = "Vui lòng nhập họ và tên"
                return@setOnClickListener
            }
            viewModel.updateName(name)
        }

        viewModel.userName.observe(viewLifecycleOwner) { name ->
            binding.nameInput.setText(name)
            if (name.isNotBlank()) {
                binding.avatarInitial.text = name.firstOrNull()?.uppercaseChar()?.toString() ?: "?"
            }
        }

        viewModel.userEmail.observe(viewLifecycleOwner) { email ->
            binding.emailInput.setText(email)
        }

        viewModel.isLoading.observe(viewLifecycleOwner) { loading ->
            binding.saveButton.isEnabled = !loading
            binding.saveButton.text = if (loading) "" else getString(com.tgdd.app.R.string.save_changes)
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

        viewModel.updateSuccess.observe(viewLifecycleOwner) { success ->
            if (success) {
                binding.successCard.visibility = View.VISIBLE
                binding.errorCard.visibility = View.GONE
                viewModel.clearUpdateSuccess()
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
