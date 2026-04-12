package com.tgdd.app.ui.orders

import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.tgdd.app.R
import com.tgdd.app.databinding.FragmentOrderDetailBinding
import dagger.hilt.android.AndroidEntryPoint
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Fragment displaying detailed order information with item list and status.
 * 
 * Navigation:
 * - FROM: OrdersFragment
 * - TO: None (back navigation only)
 * 
 * Arguments:
 * - orderId: String - Order identifier
 * 
 * Results:
 * - None
 * 
 * @see OrderDetailViewModel For order data and cancel operations
 */
@AndroidEntryPoint
class OrderDetailFragment : Fragment() {

    private var _binding: FragmentOrderDetailBinding? = null
    private val binding get() = _binding!!
    private val viewModel: OrderDetailViewModel by viewModels()
    private lateinit var adapter: OrderDetailAdapter

    private val vnd = NumberFormat.getNumberInstance(Locale("vi", "VN"))

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentOrderDetailBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        binding.toolbar.setNavigationOnClickListener { findNavController().navigateUp() }
        setupRecyclerView()
        setupCancelButton()
        observeViewModel()
    }

    private fun setupRecyclerView() {
        adapter = OrderDetailAdapter()
        binding.itemsRecyclerView.layoutManager = LinearLayoutManager(requireContext())
        binding.itemsRecyclerView.adapter = adapter
    }

    private fun setupCancelButton() {
        binding.cancelOrderButton.setOnClickListener {
            MaterialAlertDialogBuilder(requireContext())
                .setTitle(R.string.cancel_order)
                .setMessage(R.string.cancel_order_confirm)
                .setPositiveButton(R.string.confirm) { _, _ ->
                    viewModel.cancelOrder()
                }
                .setNegativeButton(R.string.cancel, null)
                .show()
        }
    }

    @Suppress("DEPRECATION")
    private fun observeViewModel() {
        viewModel.order.observe(viewLifecycleOwner) { order ->
            order?.let {
                binding.orderIdText.text = "#${it.id.take(8).uppercase()}"
                binding.orderAddressText.text = it.address.ifBlank { "—" }
                binding.orderCustomerNameText.text = it.customerName.ifBlank { "—" }
                binding.orderPhoneText.text = it.customerPhone.ifBlank { "—" }
                binding.orderTotalText.text = "${vnd.format(it.total)} ₫"

                val paymentLabel = when (it.paymentMethod) {
                    "stripe" -> "Stripe"
                    "cod" -> getString(R.string.payment_cod)
                    else -> getString(R.string.payment_cod)
                }
                binding.paymentMethodText.text = paymentLabel

                try {
                    val sdf = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale("vi"))
                    binding.orderDateText.text = sdf.format(Date(it.createdAt))
                } catch (_: Exception) {
                    binding.orderDateText.text = ""
                }

                val (label, bgColor, textColor) = when (it.status) {
                    "delivered"  -> Triple(getString(R.string.order_delivered), "#E8F5E9", "#2E7D32")
                    "shipped"    -> Triple(getString(R.string.order_shipped), "#E3F2FD", "#1565C0")
                    "preparing"  -> Triple(getString(R.string.order_preparing), "#FFF8E1", "#E65100")
                    "cancelled"  -> Triple(getString(R.string.order_cancelled), "#FFEBEE", "#C62828")
                    else         -> Triple(getString(R.string.order_pending), "#F3F4F6", "#374151")
                }
                binding.orderStatusText.text = label
                binding.orderStatusText.setBackgroundColor(Color.parseColor(bgColor))
                binding.orderStatusText.setTextColor(Color.parseColor(textColor))

                binding.cancelOrderButton.visibility = if (it.status == "preparing" || it.status == "pending") View.VISIBLE else View.GONE

                binding.contentLayout.visibility = View.VISIBLE
                binding.progressBar.visibility = View.GONE
            }
        }

        viewModel.orderItems.observe(viewLifecycleOwner) { items ->
            adapter.submitList(items)
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}