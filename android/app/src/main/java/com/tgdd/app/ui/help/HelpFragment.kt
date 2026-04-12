package com.tgdd.app.ui.help

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.ImageView
import android.widget.TextView
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import com.tgdd.app.R
import com.tgdd.app.databinding.FragmentHelpBinding
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

/**
 * Fragment displaying help center with FAQs, quick actions, and support form.
 * 
 * Navigation:
 * - FROM: ProfileFragment
 * - TO: OrdersFragment (via quick action)
 * 
 * Arguments:
 * - None
 * 
 * Results:
 * - None
 * 
 * @see HelpViewModel For FAQ data and ticket submission
 */
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
            findNavController().navigate(R.id.ordersFragment)
        }

        binding.cardDelivery.setOnClickListener {
            showInfoDialog(getString(R.string.msg_shipping_policy), getString(R.string.msg_shipping_time))
        }

        binding.cardPayment.setOnClickListener {
            showInfoDialog(getString(R.string.help_payment_title), getString(R.string.msg_payment_info))
        }

        binding.cardWarranty.setOnClickListener {
            showInfoDialog(getString(R.string.help_warranty_title), getString(R.string.msg_warranty_info))
        }

        binding.cardReturns.setOnClickListener {
            showInfoDialog(getString(R.string.help_returns_title), getString(R.string.msg_return_policy))
        }

        binding.cardContact.setOnClickListener {
            showInfoDialog(getString(R.string.help_contact_title), getString(R.string.msg_contact_info))
        }
    }

    private fun setupFAQItems() {
        binding.cardFaqOrder.setOnClickListener {
            toggleFaq(binding.textFaqAnswerOrder, binding.iconFaqOrder)
        }

        binding.cardFaqPayment.setOnClickListener {
            toggleFaq(binding.textFaqAnswerPayment, binding.iconFaqPayment)
        }

        binding.cardFaqDelivery.setOnClickListener {
            toggleFaq(binding.textFaqAnswerDelivery, binding.iconFaqDelivery)
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

        AlertDialog.Builder(requireContext())
            .setTitle(getString(R.string.issue_select_title))
            .setItems(categories) { _, which ->
                selectedCategory = categoryValues[which]
                binding.textIssuePlaceholder.text = categories[which]
            }
            .show()
    }

    private fun submitSupportRequest() {
        val description = binding.editDescription.text?.toString()?.trim().orEmpty()

        if (description.isBlank()) {
            showSupportStatus(getString(R.string.msg_fill_description), isError = true)
            return
        }

        binding.btnSubmitRequest.isEnabled = false
        binding.btnSubmitRequest.text = getString(R.string.help_sending)
        showSupportStatus(getString(R.string.help_sending), isError = false)

        lifecycleScope.launch {
            val userId = viewModel.getUserId()
            val result = viewModel.submitTicket(userId, selectedCategory, description)
            result.fold(
                onSuccess = { confirmation ->
                    binding.btnSubmitRequest.isEnabled = true
                    binding.btnSubmitRequest.text = getString(R.string.help_submit)
                    showSupportStatus(confirmation, isError = false)
                    binding.editDescription.text?.clear()
                },
                onFailure = { error ->
                    binding.btnSubmitRequest.isEnabled = true
                    binding.btnSubmitRequest.text = getString(R.string.help_submit)
                    showSupportStatus(getString(R.string.msg_submit_failed, error.message ?: ""), isError = true)
                }
            )
        }
    }

    private fun showInfoDialog(title: String, message: String) {
        AlertDialog.Builder(requireContext())
            .setTitle(title)
            .setMessage(message)
            .setPositiveButton(getString(R.string.ok), null)
            .show()
    }

    private fun toggleFaq(answerView: TextView, iconView: ImageView) {
        val expanded = answerView.visibility == View.VISIBLE
        answerView.visibility = if (expanded) View.GONE else View.VISIBLE
        iconView.rotation = if (expanded) 90f else 270f
    }

    private fun showSupportStatus(message: String, isError: Boolean) {
        binding.textSupportStatus.visibility = View.VISIBLE
        binding.textSupportStatus.text = message
        binding.textSupportStatus.setTextColor(
            resources.getColor(
                if (isError) R.color.error else R.color.status_success,
                requireContext().theme
            )
        )
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
