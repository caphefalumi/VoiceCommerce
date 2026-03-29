package com.tgdd.app.ui.checkout

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
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
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentCheckoutBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupToolbar()
        setupClickListeners()
        setupRadioGroup()
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

    private fun setupRadioGroup() {
        binding.paymentMethodGroup.setOnCheckedChangeListener { _, checkedId ->
            when (checkedId) {
                R.id.codRadioButton -> viewModel.paymentMethod.value = "cod"
                R.id.bankTransferRadioButton -> viewModel.paymentMethod.value = "bank"
                R.id.vnpayRadioButton -> viewModel.paymentMethod.value = "vnpay"
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

        viewModel.error.observe(viewLifecycleOwner) { error ->
            error?.let {
                Snackbar.make(binding.root, it, Snackbar.LENGTH_LONG).show()
                viewModel.clearError()
            }
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
