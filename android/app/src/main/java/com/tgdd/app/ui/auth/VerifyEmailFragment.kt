package com.tgdd.app.ui.auth

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import com.tgdd.app.R
import com.tgdd.app.databinding.FragmentVerifyEmailBinding
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class VerifyEmailFragment : Fragment() {

    private var _binding: FragmentVerifyEmailBinding? = null
    private val binding get() = _binding!!
    private val viewModel: VerifyEmailViewModel by viewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentVerifyEmailBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val token = arguments?.getString("token") ?: ""

        binding.actionButton.setOnClickListener {
            findNavController().navigate(R.id.loginFragment)
        }

        viewModel.verifyStatus.observe(viewLifecycleOwner) { status ->
            when (status) {
                is VerifyEmailViewModel.VerifyStatus.Loading -> {
                    binding.loadingIcon.visibility = View.VISIBLE
                    binding.statusIcon.visibility = View.GONE
                    binding.messageText.text = getString(R.string.verify_email_message_loading)
                    binding.successCard.visibility = View.GONE
                    binding.errorCard.visibility = View.GONE
                    binding.actionButton.visibility = View.GONE
                }
                is VerifyEmailViewModel.VerifyStatus.Success -> {
                    binding.loadingIcon.visibility = View.GONE
                    binding.statusIcon.visibility = View.VISIBLE
                    binding.statusIcon.setImageResource(R.drawable.ic_check_circle)
                    binding.statusIcon.setColorFilter(resources.getColor(R.color.mobi_pulse_primary, null))
                    binding.iconCard.setCardBackgroundColor(resources.getColor(android.R.color.transparent, null))
                    binding.messageText.text = getString(R.string.verify_email_message_title)
                    binding.successCard.visibility = View.VISIBLE
                    binding.errorCard.visibility = View.GONE
                    binding.actionButton.visibility = View.VISIBLE
                }
                is VerifyEmailViewModel.VerifyStatus.Error -> {
                    binding.loadingIcon.visibility = View.GONE
                    binding.statusIcon.visibility = View.VISIBLE
                    binding.statusIcon.setImageResource(R.drawable.ic_info)
                    binding.statusIcon.setColorFilter(resources.getColor(R.color.mobi_pulse_tertiary, null))
                    binding.iconCard.setCardBackgroundColor(resources.getColor(android.R.color.transparent, null))
                    binding.messageText.text = getString(R.string.verify_email_message_title)
                    binding.successCard.visibility = View.GONE
                    binding.errorCard.visibility = View.VISIBLE
                    binding.errorText.text = status.message
                    binding.actionButton.visibility = View.VISIBLE
                    binding.actionButton.text = getString(R.string.verify_email_action_back_to_login)
                }
            }
        }

        viewModel.verifyEmail(token)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
