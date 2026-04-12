package com.tgdd.app.ui.product

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.speech.RecognizerIntent
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import androidx.navigation.fragment.navArgs
import androidx.recyclerview.widget.GridLayoutManager
import com.google.android.material.dialog.MaterialAlertDialogBuilder
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

    private val voiceResultLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode != Activity.RESULT_OK) return@registerForActivityResult
        val spokenText = result.data
            ?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
            ?.firstOrNull()
            ?.trim()
            .orEmpty()
        if (spokenText.isNotBlank()) {
            binding.searchEditText.setText(spokenText)
            binding.searchEditText.setSelection(spokenText.length)
            viewModel.processVoiceCommand(spokenText)
        }
    }

    private val audioPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            launchVoiceRecognition()
        } else {
            binding.root.showErrorSnackbar(getString(R.string.voice_permission_required))
        }
    }

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
                viewModel.addToCart(product)
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
            if (!isSpeechRecognizerAvailable()) {
                binding.root.showErrorSnackbar(getString(R.string.voice_not_supported))
                return@setOnClickListener
            }
            if (hasAudioPermission()) {
                launchVoiceRecognition()
            } else {
                audioPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
            }
        }
    }

    private fun hasAudioPermission(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true
        return ContextCompat.checkSelfPermission(
            requireContext(),
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
    }

    private fun isSpeechRecognizerAvailable(): Boolean {
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
        val activities = requireContext().packageManager.queryIntentActivities(intent, 0)
        return activities.isNotEmpty()
    }

    private fun launchVoiceRecognition() {
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "vi-VN")
            putExtra(RecognizerIntent.EXTRA_PROMPT, getString(R.string.voice_search))
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false)
        }
        voiceResultLauncher.launch(intent)
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

        viewModel.addedToCart.observe(viewLifecycleOwner) { added ->
            if (added) {
                val message = viewModel.addedToCartMessage.value ?: getString(R.string.added_to_cart)
                com.google.android.material.snackbar.Snackbar
                    .make(binding.root, message, com.google.android.material.snackbar.Snackbar.LENGTH_LONG)
                    .setAction(getString(R.string.view_cart)) {
                        findNavController().navigate(R.id.action_productList_to_cart)
                    }
                    .show()
                viewModel.clearAddedToCartMessage()
                viewModel.resetAddedToCart()
            }
        }

        viewModel.requireLogin.observe(viewLifecycleOwner) { required ->
            if (required == true) {
                showLoginRequiredDialog()
                viewModel.resetRequireLogin()
            }
        }

        viewModel.assistantResponse.observe(viewLifecycleOwner) { text ->
            text?.let {
                binding.root.showInfoSnackbar(it)
                viewModel.clearAssistantResponse()
            }
        }

        viewModel.navigateToCheckout.observe(viewLifecycleOwner) { shouldNavigate ->
            if (shouldNavigate == true) {
                findNavController().navigate(R.id.checkoutFragment)
                viewModel.onNavigatedToCheckout()
            }
        }
    }

    private fun showLoginRequiredDialog() {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Đăng nhập để tiếp tục")
            .setMessage("Bạn cần đăng nhập để thêm sản phẩm vào giỏ hàng.")
            .setPositiveButton("Đăng nhập") { _, _ ->
                findNavController().navigate(R.id.action_global_login)
            }
            .setNegativeButton(getString(R.string.cancel), null)
            .show()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
