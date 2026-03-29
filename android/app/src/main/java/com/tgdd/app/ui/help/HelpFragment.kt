package com.tgdd.app.ui.help

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import com.google.android.material.snackbar.Snackbar
import com.tgdd.app.R
import com.tgdd.app.databinding.FragmentHelpBinding
import com.tgdd.app.data.repository.TicketRepository
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class HelpFragment : Fragment() {

    private var _binding: FragmentHelpBinding? = null
    private val binding get() = _binding!!

    private val viewModel: HelpViewModel by viewModels()
    private var selectedCategory: String = "other"

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentHelpBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupQuickActions()
        setupFAQItems()
        setupSupportForm()
        observeViewModel()
    }

    private fun setupQuickActions() {
        binding.cardOrders.setOnClickListener {
            Snackbar.make(binding.root, getString(R.string.msg_check_order_status), Snackbar.LENGTH_LONG)
                .setAction(getString(R.string.msg_view_orders)) {
                    // Navigate to profile/orders tab
                }.show()
        }

        binding.cardDelivery.setOnClickListener {
            showInfoSnackbar(getString(R.string.msg_shipping_policy), getString(R.string.msg_shipping_time))
        }

        binding.cardPayment.setOnClickListener {
            showInfoSnackbar(getString(R.string.help_payment_title), getString(R.string.msg_payment_info))
        }

        binding.cardWarranty.setOnClickListener {
            showInfoSnackbar(getString(R.string.help_warranty_title), getString(R.string.msg_warranty_info))
        }

        binding.cardReturns.setOnClickListener {
            showInfoSnackbar(getString(R.string.help_returns_title), getString(R.string.msg_return_policy))
        }

        binding.cardContact.setOnClickListener {
            showInfoSnackbar(getString(R.string.help_contact_title), getString(R.string.msg_contact_info))
        }
    }

    private fun setupFAQItems() {
        binding.cardFaqOrder.setOnClickListener {
            Snackbar.make(binding.root, getString(R.string.msg_order_guide), Snackbar.LENGTH_LONG).show()
        }

        binding.cardFaqPayment.setOnClickListener {
            Snackbar.make(binding.root, getString(R.string.msg_payment_guide), Snackbar.LENGTH_LONG).show()
        }

        binding.cardFaqDelivery.setOnClickListener {
            Snackbar.make(binding.root, getString(R.string.msg_delivery_time), Snackbar.LENGTH_LONG).show()
        }
    }

    private fun setupSupportForm() {
        binding.btnCallNow.setOnClickListener {
            val intent = Intent(Intent.ACTION_DIAL).apply {
                data = Uri.parse("tel:18002091")
            }
            startActivity(intent)
        }

        binding.cardIssueSelector.setOnClickListener {
            showCategoryPicker()
        }

        binding.btnSubmitRequest.setOnClickListener {
            submitSupportRequest()
        }
    }

    private fun showCategoryPicker() {
        val categories = arrayOf(
            getString(R.string.issue_product_defect),
            getString(R.string.issue_delivery),
            getString(R.string.issue_payment),
            getString(R.string.issue_return),
            getString(R.string.issue_warranty),
            getString(R.string.issue_other)
        )
        val categoryValues = arrayOf("product_issue", "delivery", "payment", "return_exchange", "warranty", "other")

        androidx.appcompat.app.AlertDialog.Builder(requireContext())
            .setTitle(getString(R.string.issue_select_title))
            .setItems(categories) { _, which ->
                selectedCategory = categoryValues[which]
                val textView = binding.cardIssueSelector.findViewById<android.widget.TextView>(R.id.textIssuePlaceholder)
                if (textView != null) {
                    textView.text = categories[which]
                } else {
                    Snackbar.make(binding.root, categories[which], Snackbar.LENGTH_SHORT).show()
                }
            }
            .show()
    }

    private fun submitSupportRequest() {
        val description = binding.editDescription.text?.toString() ?: ""

        if (description.isBlank()) {
            Snackbar.make(binding.root, getString(R.string.msg_fill_description), Snackbar.LENGTH_SHORT).show()
            return
        }

        binding.btnSubmitRequest.isEnabled = false
        binding.btnSubmitRequest.text = getString(R.string.help_sending)

        lifecycleScope.launch {
            val userId = viewModel.getUserId()
            val result = viewModel.submitTicket(userId, selectedCategory, description)
            result.fold(
                onSuccess = { confirmation ->
                    binding.btnSubmitRequest.isEnabled = true
                    binding.btnSubmitRequest.text = getString(R.string.help_submit)
                    Snackbar.make(binding.root, confirmation, Snackbar.LENGTH_LONG).show()
                    binding.editDescription.text?.clear()
                },
                onFailure = { error ->
                    binding.btnSubmitRequest.isEnabled = true
                    binding.btnSubmitRequest.text = getString(R.string.help_submit)
                    Snackbar.make(binding.root, getString(R.string.msg_submit_failed, error.message ?: ""), Snackbar.LENGTH_LONG).show()
                }
            )
        }
    }

    private fun showInfoSnackbar(title: String, message: String) {
        Snackbar.make(binding.root, "$title: $message", Snackbar.LENGTH_LONG).show()
    }

    private fun observeViewModel() {
        viewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            binding.btnSubmitRequest.isEnabled = !isLoading
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
