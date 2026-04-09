package com.tgdd.app.ui.cart

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.ItemTouchHelper
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.snackbar.Snackbar
import com.tgdd.app.R
import com.tgdd.app.databinding.FragmentCartBinding
import com.tgdd.app.ui.adapter.CartAdapter
import dagger.hilt.android.AndroidEntryPoint
import java.util.Locale

@AndroidEntryPoint
class CartFragment : Fragment() {

    private var _binding: FragmentCartBinding? = null
    private val binding get() = _binding!!

    private val viewModel: CartViewModel by viewModels()
    private lateinit var cartAdapter: CartAdapter

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
        setupRecyclerView()
        setupSwipeRefresh()
        setupClickListeners()
        observeViewModel()
    }

    private fun setupRecyclerView() {
        cartAdapter = CartAdapter(
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
                    val item = cartAdapter.currentList[position]
                    viewModel.removeItem(item.id)
                    Snackbar.make(binding.root, getString(R.string.item_removed), Snackbar.LENGTH_SHORT).show()
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
            findNavController().navigate(R.id.checkoutFragment)
        }

        binding.shopNowButton.setOnClickListener {
            findNavController().navigate(R.id.productListFragment)
        }

        binding.voucherRow.setOnClickListener {
            Snackbar.make(binding.root, getString(R.string.voucher_feature_coming_soon), Snackbar.LENGTH_SHORT).show()
        }
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
