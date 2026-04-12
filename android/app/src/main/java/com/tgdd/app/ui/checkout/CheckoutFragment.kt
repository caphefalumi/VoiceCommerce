package com.tgdd.app.ui.checkout

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
import com.tgdd.app.data.local.UserSession
import com.tgdd.app.databinding.FragmentCheckoutBinding
import dagger.hilt.android.AndroidEntryPoint
import java.util.Locale
import javax.inject.Inject

/**
 * Fragment for placing orders with address input and coupon application.
 * 
 * Navigation:
 * - FROM: CartFragment
 * - TO: ProductListFragment (on order success)
 * 
 * Arguments:
 * - None
 * 
 * Results:
 * - orderId: String? - Created order ID returned via ViewModel
 * 
 * @see CheckoutViewModel For order placement logic
 */
@AndroidEntryPoint
class CheckoutFragment : Fragment() {

    private var _binding: FragmentCheckoutBinding? = null
    private val binding get() = _binding!!

    private val viewModel: CheckoutViewModel by viewModels()

    @Inject
    lateinit var userSession: UserSession

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
        
        if (!userSession.isLoggedIn()) {
            showLoginRequiredDialog()
            return
        }
        
        setupToolbar()
        setupClickListeners()
        observeViewModel()
    }

    private fun showLoginRequiredDialog() {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle(getString(R.string.login_required))
            .setMessage(getString(R.string.login_required_message))
            .setPositiveButton(getString(R.string.login)) { _, _ ->
                findNavController().navigate(R.id.action_global_login)
            }
            .setNegativeButton(getString(R.string.cancel)) { _, _ ->
                findNavController().navigateUp()
            }
            .setCancelable(false)
            .show()
    }

    private fun setupToolbar() {
        binding.toolbar.setNavigationOnClickListener {
            findNavController().navigateUp()
        }
    }

    private fun setupClickListeners() {
        binding.applyCouponButton.setOnClickListener {
            val rawCode = binding.couponInput.text?.toString()?.trim().orEmpty()
            if (rawCode.isBlank()) {
                Snackbar.make(binding.root, getString(R.string.coupon_code_hint), Snackbar.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            viewModel.applyPromoCode(rawCode)
        }

        binding.placeOrderButton.setOnClickListener {
            val items = viewModel.cartItems.value ?: emptyList()
            val total = viewModel.finalTotal.value ?: viewModel.cartTotal.value ?: 0.0
            
            viewModel.name.value = binding.nameInput.text.toString()
            viewModel.address.value = binding.addressInput.text.toString()
            viewModel.phone.value = binding.phoneInput.text.toString()
            viewModel.city.value = binding.cityInput.text.toString()
            viewModel.paymentMethod.value = "cod"
            
            viewModel.placeOrder(items, total)
        }
    }

    private fun observeViewModel() {
        viewModel.cartTotal.observe(viewLifecycleOwner) { total ->
            val subtotal = total ?: 0.0
            val finalTotal = viewModel.finalTotal.value ?: subtotal
            binding.finalTotalText.text = formatVnd(finalTotal)
            binding.placeOrderButton.text = getString(
                R.string.place_order_with_total,
                String.format(Locale.US, "%.0f", finalTotal)
            )
        }

        viewModel.discountAmount.observe(viewLifecycleOwner) { discount ->
            binding.discountAmountText.text = formatVnd(discount ?: 0.0)
        }

        viewModel.finalTotal.observe(viewLifecycleOwner) { finalTotal ->
            val amount = finalTotal ?: 0.0
            binding.finalTotalText.text = formatVnd(amount)
            binding.placeOrderButton.text = getString(
                R.string.place_order_with_total,
                String.format(Locale.US, "%.0f", amount)
            )
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

        viewModel.couponMessage.observe(viewLifecycleOwner) { message ->
            message?.let {
                Snackbar.make(binding.root, it, Snackbar.LENGTH_SHORT).show()
                viewModel.clearCouponMessage()
            }
        }
    }

    private fun formatVnd(amount: Double): String {
        return String.format(Locale("vi", "VN"), "%,.0f₫", amount)
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
