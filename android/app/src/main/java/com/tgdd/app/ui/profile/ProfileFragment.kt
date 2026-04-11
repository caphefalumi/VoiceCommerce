package com.tgdd.app.ui.profile

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.snackbar.Snackbar
import com.tgdd.app.R
import com.tgdd.app.data.auth.FirebaseAuthHelper
import com.tgdd.app.databinding.FragmentProfileBinding
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class ProfileFragment : Fragment() {

    private var _binding: FragmentProfileBinding? = null
    private val binding get() = _binding!!
    private val viewModel: ProfileViewModel by viewModels()

    private val firebaseAuthHelper by lazy { FirebaseAuthHelper(requireActivity()) }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentProfileBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupClickListeners()
        observeViewModel()
    }

    private fun setupClickListeners() {
        binding.loginPromptButton.setOnClickListener {
            findNavController().navigate(R.id.action_global_login)
        }
        binding.registerPromptButton.setOnClickListener {
            findNavController().navigate(R.id.registerFragment)
        }
        binding.logoutButton.setOnClickListener { showLogoutConfirmation() }
        binding.editProfileRow.setOnClickListener {
            if (viewModel.isLoggedIn.value == true) {
                findNavController().navigate(R.id.accountSettingsFragment)
            } else {
                findNavController().navigate(R.id.action_global_login)
            }
        }
        binding.notificationsRow.setOnClickListener {
            Snackbar.make(binding.root, getString(R.string.notifications_coming_soon), Snackbar.LENGTH_SHORT).show()
        }
        binding.helpCenterRow.setOnClickListener { showAboutDialog() }
        binding.ordersRow.setOnClickListener {
            if (viewModel.isLoggedIn.value == true) {
                findNavController().navigate(R.id.ordersFragment)
            } else {
                findNavController().navigate(R.id.action_global_login)
            }
        }
        binding.statusPendingCard.root.setOnClickListener {
            Snackbar.make(binding.root, getString(R.string.pending_orders_coming_soon), Snackbar.LENGTH_SHORT).show()
        }
        binding.statusPreparingCard.root.setOnClickListener {
            Snackbar.make(binding.root, getString(R.string.preparing_orders_coming_soon), Snackbar.LENGTH_SHORT).show()
        }
        binding.statusShippedCard.root.setOnClickListener {
            Snackbar.make(binding.root, getString(R.string.shipped_orders_coming_soon), Snackbar.LENGTH_SHORT).show()
        }
        binding.statusDeliveredCard.root.setOnClickListener {
            Snackbar.make(binding.root, getString(R.string.delivered_orders_coming_soon), Snackbar.LENGTH_SHORT).show()
        }
    }

    private fun observeViewModel() {
        viewModel.isLoggedIn.observe(viewLifecycleOwner) { updateLoginState(it) }
        viewModel.userName.observe(viewLifecycleOwner) { binding.userNameText.text = it }
        viewModel.userEmail.observe(viewLifecycleOwner) { email ->
            binding.userEmailText.text = email
            binding.userEmailText.visibility = if (email.isBlank()) View.GONE else View.VISIBLE
        }
        viewModel.orders.observe(viewLifecycleOwner) { orders ->
            binding.orderCountText.text = orders.size.toString()
        }
        viewModel.error.observe(viewLifecycleOwner) { error ->
            error?.let {
                Snackbar.make(binding.root, it, Snackbar.LENGTH_LONG).show()
                viewModel.clearError()
            }
        }
        viewModel.isLoading.observe(viewLifecycleOwner) { loading ->
            binding.loginPromptButton.isEnabled = !loading
        }
    }

    private fun updateLoginState(isLoggedIn: Boolean) {
        if (isLoggedIn) {
            binding.logoutButton.visibility = View.VISIBLE
            binding.loginPromptCard.visibility = View.GONE
            binding.profileContent.visibility = View.VISIBLE
        } else {
            binding.logoutButton.visibility = View.GONE
            binding.loginPromptCard.visibility = View.VISIBLE
            binding.profileContent.visibility = View.GONE
        }
    }

    private fun showLogoutConfirmation() {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle(getString(R.string.logout))
            .setMessage(getString(R.string.logout_confirmation_message))
            .setPositiveButton(getString(R.string.logout)) { _, _ ->
                firebaseAuthHelper.signOut()
                viewModel.logout()
            }
            .setNegativeButton(getString(R.string.cancel), null)
            .show()
    }

    private fun showAboutDialog() {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle(getString(R.string.about_title))
            .setMessage(getString(R.string.about_message))
            .setPositiveButton(getString(R.string.ok), null)
            .show()
    }

    override fun onResume() {
        super.onResume()
        // Refresh login state when returning from auth screens
        viewModel.refreshSession()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
