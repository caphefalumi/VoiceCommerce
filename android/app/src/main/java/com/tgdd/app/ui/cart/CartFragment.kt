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
import com.tgdd.app.R
import com.tgdd.app.data.local.UserSession
import com.tgdd.app.data.repository.ProductRepository
import com.tgdd.app.databinding.FragmentCartBinding
import com.tgdd.app.ui.adapter.CartAdapter
import com.tgdd.app.ui.adapter.OrderSummaryAdapter
import dagger.hilt.android.AndroidEntryPoint
import java.util.Locale
import javax.inject.Inject

/**
 * Fragment displaying shopping cart with quantity management and coupon input.
 * 
 * Navigation:
 * - FROM: ProductListFragment, ProductDetailFragment (global action)
 * - TO: CheckoutFragment (checkout button), ProductListFragment (shop now)
 * 
 * Arguments:
 * - showBackButton: Boolean - Whether to show back navigation (default: true)
 * 
 * Results:
 * - None
 * 
 * @see CartViewModel For cart state and operations
 * @see CartAdapter For item rendering
 */
@AndroidEntryPoint
class CartFragment : Fragment() {

    private var _binding: FragmentCartBinding? = null
    private val binding get() = _binding!!

    private val viewModel: CartViewModel by viewModels()
    private val args: CartFragmentArgs by navArgs()
    private lateinit var cartAdapter: CartAdapter
    private lateinit var orderSummaryAdapter: OrderSummaryAdapter

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
        setupOrderSummaryRecyclerView()
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
                item.productId?.let { productId ->
                    viewModel.updateQuantity(productId, quantity)
                }
            },
            onRemoveClicked = { item ->
                item.productId?.let { productId ->
                    viewModel.removeItem(productId)
                    Snackbar.make(binding.root, getString(R.string.item_removed), Snackbar.LENGTH_SHORT).show()
                }
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
                        item.productId?.let { productId ->
                            viewModel.removeItem(productId)
                            Snackbar.make(binding.root, getString(R.string.item_removed), Snackbar.LENGTH_SHORT).show()
                        }
                    }
                }
            }
            ItemTouchHelper(swipeHandler).attachToRecyclerView(this)
        }
    }

    private fun setupOrderSummaryRecyclerView() {
        orderSummaryAdapter = OrderSummaryAdapter(
            onRemoveClicked = { item ->
                item.productId?.let { productId ->
                    viewModel.removeItem(productId)
                    Snackbar.make(binding.root, getString(R.string.item_removed), Snackbar.LENGTH_SHORT).show()
                }
            }
        )
        binding.orderSummaryRecyclerView.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = orderSummaryAdapter
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

    @Suppress("DEPRECATION")
    private fun observeViewModel() {
        viewModel.cartItems.observe(viewLifecycleOwner) { items ->
            android.util.Log.d("CartFragment", "Cart items received: ${items.size} items")
            items.forEach { item ->
                android.util.Log.d("CartFragment", "Item: ${item.name}, qty: ${item.quantity}, price: ${item.price}")
            }
            cartAdapter.submitList(items)
            orderSummaryAdapter.submitList(items)
            val isEmpty = items.isEmpty()
            binding.emptyCartLayout.visibility = if (isEmpty) View.VISIBLE else View.GONE
            binding.cartRecyclerView.visibility = if (isEmpty) View.GONE else View.VISIBLE
            binding.orderSummaryCard.visibility = if (isEmpty) View.GONE else View.VISIBLE
            binding.checkoutBar.visibility = if (isEmpty) View.GONE else View.VISIBLE
            // Hide voucher row in cart view
            binding.voucherRow.visibility = View.GONE
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
