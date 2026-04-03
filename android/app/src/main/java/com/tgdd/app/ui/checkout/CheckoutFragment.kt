package com.tgdd.app.ui.checkout

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import com.google.android.material.snackbar.Snackbar
import com.tgdd.app.R
import com.tgdd.app.databinding.FragmentCheckoutBinding
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class CheckoutFragment : Fragment() {

    private var _binding: FragmentCheckoutBinding? = null
    private val binding get() = _binding!!

    private val viewModel: CheckoutViewModel by viewModels()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: View?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentCheckoutBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupToolbar()
        setupClickListeners()
        setupPaymentOptions()
        observeViewModel()
    }

    private fun setupToolbar() {
        binding.toolbar.setNavigationOnClickListener {
            findNavController().navigateUp()
        }
    }

    private fun setupClickListeners() {
        binding.placeOrderButton.setOnClickListener {
            val items = viewModel.cartItems.value ?: emptyList()
            val total = viewModel.cartTotal.value ?: 0.0
            
            viewModel.name.value = binding.nameInput.text.toString()
            viewModel.address.value = binding.addressInput.text.toString()
            viewModel.phone.value = binding.phoneInput.text.toString()
            viewModel.city.value = binding.cityInput.text.toString()
            
            viewModel.placeOrder(items, total)
        }
    }

    private fun setupPaymentOptions() {
        binding.codOption.setOnClickListener {
            viewModel.paymentMethod.value = "cod"
            binding.codRadioButton.isChecked = true
            updatePaymentOptionUI("cod")
        }
        binding.stripeOption.setOnClickListener {
            viewModel.paymentMethod.value = "stripe"
            binding.stripeRadioButton.isChecked = true
            updatePaymentOptionUI("stripe")
        }
        binding.codRadioButton.isChecked = true
        updatePaymentOptionUI("cod")
    }

    private fun updatePaymentOptionUI(selected: String) {
        val primaryColor = ContextCompat.getColor(requireContext(), R.color.mobi_pulse_primary)
        val variantColor = ContextCompat.getColor(requireContext(), R.color.mobi_pulse_outline_variant)
        val containerColor = ContextCompat.getColor(requireContext(), R.color.mobi_pulse_primary_container)
        val cardBgColor = 0xFFF2F4F7.toInt()

        binding.codOption.apply {
            if (selected == "cod") {
                strokeColor = android.content.res.ColorStateList.valueOf(primaryColor)
                strokeWidth = (3 * resources.displayMetrics.density).toInt()
                setCardBackgroundColor(containerColor)
            } else {
                strokeColor = android.content.res.ColorStateList.valueOf(variantColor)
                strokeWidth = (2 * resources.displayMetrics.density).toInt()
                setCardBackgroundColor(cardBgColor)
            }
        }
        binding.stripeOption.apply {
            if (selected == "stripe") {
                strokeColor = android.content.res.ColorStateList.valueOf(primaryColor)
                strokeWidth = (3 * resources.displayMetrics.density).toInt()
                setCardBackgroundColor(containerColor)
            } else {
                strokeColor = android.content.res.ColorStateList.valueOf(variantColor)
                strokeWidth = (2 * resources.displayMetrics.density).toInt()
                setCardBackgroundColor(cardBgColor)
            }
        }
    }

    private fun observeViewModel() {
        viewModel.cartTotal.observe(viewLifecycleOwner) { total ->
            binding.totalText.text = getString(R.string.total_format, String.format("%.0f", total ?: 0.0))
        }

        viewModel.nameError.observe(viewLifecycleOwner) { error ->
            binding.nameInputLayout.error = error
        }

        viewModel.addressError.observe(viewLifecycleOwner) { error ->
            binding.addressInputLayout.error = error
        }

        viewModel.phoneError.observe(viewLifecycleOwner) { error ->
            binding.phoneInputLayout.error = error
        }

        viewModel.cityError.observe(viewLifecycleOwner) { error ->
            binding.cityInputLayout.error = error
        }

        viewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            binding.progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
            binding.placeOrderButton.isEnabled = !isLoading
        }

        viewModel.orderPlaced.observe(viewLifecycleOwner) { placed ->
            if (placed) {
                showOrderSuccessDialog()
            }
        }

        viewModel.checkoutUrl.observe(viewLifecycleOwner) { url ->
            url?.let {
                launchStripeCheckout(it)
                viewModel.resetCheckoutUrl()
            }
        }

        viewModel.error.observe(viewLifecycleOwner) { error ->
            error?.let {
                Snackbar.make(binding.root, it, Snackbar.LENGTH_LONG).show()
                viewModel.clearError()
            }
        }
    }

    private fun launchStripeCheckout(url: String) {
        try {
            val customTabsIntent = CustomTabsIntent.Builder()
                .setShowTitle(true)
                .build()
            customTabsIntent.launchUrl(requireContext(), Uri.parse(url))
        } catch (e: Exception) {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            startActivity(intent)
        }
    }

    private fun showOrderSuccessDialog() {
        val orderId = viewModel.orderId.value
        com.google.android.material.dialog.MaterialAlertDialogBuilder(requireContext())
            .setTitle(getString(R.string.order_placed_title))
            .setMessage(getString(R.string.order_placed_message, orderId ?: "N/A"))
            .setPositiveButton(getString(R.string.ok)) { _, _ ->
                findNavController().navigate(R.id.productListFragment)
            }
            .setCancelable(false)
            .show()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
