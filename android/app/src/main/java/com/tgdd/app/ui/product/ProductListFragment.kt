package com.tgdd.app.ui.product

import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import androidx.navigation.fragment.navArgs
import androidx.recyclerview.widget.GridLayoutManager
import com.tgdd.app.R
import com.tgdd.app.databinding.FragmentProductListBinding
import com.tgdd.app.ui.adapter.ProductAdapter
import com.tgdd.app.ui.utils.*
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class ProductListFragment : Fragment() {

    private var _binding: FragmentProductListBinding? = null
    private val binding get() = _binding!!

    private val viewModel: ProductListViewModel by viewModels()
    private val args: ProductListFragmentArgs by navArgs()
    private lateinit var productAdapter: ProductAdapter

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentProductListBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupRecyclerView()
        setupSwipeRefresh()
        setupSearchView()
        setupVoiceSearch()
        setupPriceFilter()
        setupCategoryChips()
        setupCartButton()
        observeViewModel()

        val category = args.category
        val brand = args.brand
        if (!category.isNullOrBlank() || !brand.isNullOrBlank()) {
            viewModel.loadProducts(category, brand)
        }
    }

    private fun setupRecyclerView() {
        productAdapter = ProductAdapter(
            onProductClick = { product ->
                val action = ProductListFragmentDirections.actionProductListToDetail(product.id)
                findNavController().navigate(action)
            },
            onAddToCart = { product ->
                // Navigate to detail for add-to-cart (handles auth check there)
                val action = ProductListFragmentDirections.actionProductListToDetail(product.id)
                findNavController().navigate(action)
            }
        )
        binding.productsRecyclerView.apply {
            layoutManager = GridLayoutManager(requireContext(), 2)
            adapter = productAdapter
            // Performance optimizations
            setHasFixedSize(true)
            setItemViewCacheSize(20)
            recycledViewPool.setMaxRecycledViews(0, 20)
        }
    }

    private fun setupCartButton() {
        binding.cartButton.setOnClickListener {
            findNavController().navigate(R.id.action_productList_to_cart)
        }
    }
    private fun setupSearchView() {
        binding.searchEditText.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                val query = s?.toString() ?: ""
                if (query.isBlank()) {
                    viewModel.refreshProducts()
                } else if (query.length >= 2) {
                    viewModel.searchProducts(query)
                }
            }
        })
    }

    private fun setupVoiceSearch() {
        binding.micButton.setOnClickListener {
            binding.root.showInfoSnackbar(getString(R.string.voice_search_coming_soon))
        }
    }

    private fun setupPriceFilter() {
        binding.filterToggleButton.setOnClickListener {
            binding.filterPanel.toggleVisibility()
        }
        
        binding.applyFilterButton.setOnClickListener {
            val min = binding.minPriceInput.text?.toString()?.toDoubleOrNull()
            val max = binding.maxPriceInput.text?.toString()?.toDoubleOrNull()
            
            if (min != null && max != null && min > max) {
                binding.root.showErrorSnackbar("Giá tối thiểu phải nhỏ hơn giá tối đa")
                return@setOnClickListener
            }
            
            viewModel.setPriceRange(min, max)
            binding.clearFilterButton.visibility = if (min != null || max != null) View.VISIBLE else View.GONE
            binding.filterPanel.hide()
            
            if (min != null || max != null) {
                binding.root.showSuccessSnackbar("Đã áp dụng bộ lọc")
            }
        }
        
        binding.clearFilterButton.setOnClickListener {
            binding.minPriceInput.text?.clear()
            binding.maxPriceInput.text?.clear()
            binding.clearFilterButton.hide()
            viewModel.clearFilters()
            binding.root.showInfoSnackbar("Đã xóa bộ lọc")
        }
    }

    private fun setupCategoryChips() {
        binding.categoryChipGroup.setOnCheckedStateChangeListener { _, checkedIds ->
            val category = when (checkedIds.firstOrNull()) {
                R.id.chipPhones -> "Điện thoại"
                R.id.chipLaptops -> "Laptop"
                R.id.chipTablets -> "Máy tính bảng"
                R.id.chipWearables -> "Đồng hồ"
                R.id.chipAccessories -> "Phụ kiện"
                else -> null
            }
            viewModel.loadProducts(category)
        }
    }

    private fun setupSwipeRefresh() {
        binding.swipeRefreshLayout.setOnRefreshListener {
            viewModel.refreshProducts()
        }
    }

    private fun observeViewModel() {
        viewModel.products.observe(viewLifecycleOwner) { products ->
            productAdapter.submitList(products)
            val isEmpty = products.isEmpty()
            
            if (isEmpty) {
                binding.productsRecyclerView.hide()
                binding.errorText.apply {
                    show()
                    text = "Không tìm thấy sản phẩm"
                }
            } else {
                binding.productsRecyclerView.fadeIn()
                binding.errorText.hide()
            }
        }

        viewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            if (isLoading) {
                binding.progressBar.fadeIn()
            } else {
                binding.progressBar.fadeOut()
            }
            binding.swipeRefreshLayout.isRefreshing = isLoading
        }

        viewModel.error.observe(viewLifecycleOwner) { error ->
            error?.let {
                binding.root.showErrorSnackbar(it) {
                    viewModel.refreshProducts()
                }
                viewModel.clearError()
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
