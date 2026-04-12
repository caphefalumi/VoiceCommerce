package com.tgdd.app.ui.cart

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import androidx.navigation.fragment.navArgs
import androidx.recyclerview.widget.ItemTouchHelper
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.snackbar.Snackbar
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import com.tgdd.app.R
import com.tgdd.app.data.local.UserSession
import com.tgdd.app.data.repository.ProductRepository
import com.tgdd.app.databinding.FragmentCartBinding
import com.tgdd.app.ui.adapter.CartAdapter
import dagger.hilt.android.AndroidEntryPoint
import java.util.Locale
import javax.inject.Inject

@AndroidEntryPoint
class CartFragment : Fragment() {

    private var _binding: FragmentCartBinding? = null
    private val binding get() = _binding!!

    private val viewModel: CartViewModel by viewModels()
    private val args: CartFragmentArgs by navArgs()
    private lateinit var cartAdapter: CartAdapter

    @Inject
    lateinit var userSession: UserSession

    @Inject
    lateinit var productRepository: ProductRepository

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentCartBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupToolbar()
        setupRecyclerView()
        setupSwipeRefresh()
        setupClickListeners()
        observeViewModel()
        
        // Sync cart with server when fragment loads
        viewModel.refreshCart()
    }

    private fun setupToolbar() {
        // Only show back button if navigating from home screen cart button
        if (args.showBackButton) {
            binding.toolbar.setNavigationOnClickListener { findNavController().navigateUp() }
        } else {
            binding.toolbar.navigationIcon = null
        }
    }

    private fun setupRecyclerView() {
        cartAdapter = CartAdapter(
            productRepository = productRepository,
            onQuantityChanged = { item, quantity ->
                viewModel.updateQuantity(item.id, quantity)
            },
            onRemoveClicked = { item ->
                viewModel.removeItem(item.id)
                Snackbar.make(binding.root, getString(R.string.item_removed), Snackbar.LENGTH_SHORT).show()
            }
        )
        // New Stitch layout uses cartRecyclerView ID
        binding.cartRecyclerView.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = cartAdapter
            val swipeHandler = object : SwipeToDeleteCallback(requireContext()) {
                override fun onSwiped(viewHolder: RecyclerView.ViewHolder, direction: Int) {
                    val position = viewHolder.bindingAdapterPosition
                    if (position != RecyclerView.NO_POSITION && position < cartAdapter.currentList.size) {
                        val item = cartAdapter.currentList[position]
                        viewModel.removeItem(item.id)
                        Snackbar.make(binding.root, getString(R.string.item_removed), Snackbar.LENGTH_SHORT).show()
                    }
                }
            }
            ItemTouchHelper(swipeHandler).attachToRecyclerView(this)
        }
    }

    private fun setupSwipeRefresh() {
        binding.swipeRefreshLayout.setOnRefreshListener {
            viewModel.refreshCart()
        }
    }

    private fun setupClickListeners() {
        binding.checkoutButton.setOnClickListener {
            if (userSession.isLoggedIn()) {
                findNavController().navigate(R.id.checkoutFragment)
            } else {
                showLoginRequiredDialog()
            }
        }

        binding.shopNowButton.setOnClickListener {
            findNavController().navigate(R.id.productListFragment)
        }

        binding.voucherRow.setOnClickListener {
            if (!userSession.isLoggedIn()) {
                showLoginRequiredDialog()
                return@setOnClickListener
            }
            showCouponInputDialog()
        }
    }

    private fun showCouponInputDialog() {
        val container = LayoutInflater.from(requireContext())
            .inflate(com.google.android.material.R.layout.design_text_input_end_icon, null)
        val inputLayout = TextInputLayout(requireContext()).apply {
            hint = getString(R.string.coupon_code_hint)
        }
        val input = TextInputEditText(requireContext()).apply {
            setSingleLine(true)
        }
        inputLayout.addView(input)

        MaterialAlertDialogBuilder(requireContext())
            .setTitle(getString(R.string.coupon_code))
            .setView(inputLayout)
            .setPositiveButton(getString(R.string.apply), null)
            .setNegativeButton(getString(R.string.cancel), null)
            .create()
            .also { dialog ->
                dialog.setOnShowListener {
                    dialog.getButton(android.app.AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                        val code = input.text?.toString()?.trim().orEmpty()
                        if (code.isBlank()) {
                            inputLayout.error = getString(R.string.coupon_code_hint)
                            return@setOnClickListener
                        }
                        inputLayout.error = null
                        viewModel.applyCoupon(code)
                        dialog.dismiss()
                    }
                }
                dialog.show()
            }
    }

    private fun showLoginRequiredDialog() {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle(getString(R.string.login_required))
            .setMessage(getString(R.string.login_required_message))
            .setPositiveButton(getString(R.string.login)) { _, _ ->
                findNavController().navigate(R.id.action_global_login)
            }
            .setNegativeButton(getString(R.string.cancel), null)
            .show()
    }

    private fun observeViewModel() {
        viewModel.cartItems.observe(viewLifecycleOwner) { items ->
            cartAdapter.submitList(items)
            val isEmpty = items.isEmpty()
            binding.emptyCartLayout.visibility = if (isEmpty) View.VISIBLE else View.GONE
            binding.cartRecyclerView.visibility = if (isEmpty) View.GONE else View.VISIBLE
            binding.orderSummaryCard.visibility = if (isEmpty) View.GONE else View.VISIBLE
            binding.checkoutBar.visibility = if (isEmpty) View.GONE else View.VISIBLE
        }

        viewModel.cartTotal.observe(viewLifecycleOwner) { total ->
            val formattedTotal = String.format(Locale("vi", "VN"), "%,.0f₫", total ?: 0.0)
            binding.totalPriceText.text = formattedTotal
            binding.subtotalText.text = formattedTotal
        }

        viewModel.finalTotal.observe(viewLifecycleOwner) { finalTotal ->
            val formattedFinal = String.format(Locale("vi", "VN"), "%,.0f₫", finalTotal ?: 0.0)
            binding.totalPriceText.text = formattedFinal
        }

        viewModel.error.observe(viewLifecycleOwner) { error ->
            error?.let {
                Snackbar.make(binding.root, it, Snackbar.LENGTH_LONG).show()
                viewModel.clearError()
            }
        }

        viewModel.isRefreshing.observe(viewLifecycleOwner) { isRefreshing ->
            binding.swipeRefreshLayout.isRefreshing = isRefreshing
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
