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
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import androidx.navigation.fragment.navArgs
import androidx.recyclerview.widget.GridLayoutManager
import kotlinx.coroutines.launch
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.tgdd.app.R
import com.tgdd.app.databinding.FragmentProductListBinding
import com.tgdd.app.ui.adapter.ProductAdapter
import com.tgdd.app.ui.utils.*
import dagger.hilt.android.AndroidEntryPoint

/**
 * Fragment displaying products in grid view with search, voice search, and filtering.
 * 
 * Navigation:
 * - FROM: CategoryFragment, SearchFragment, home screen
 * - TO: ProductDetailFragment (on product click), CartFragment (cart button)
 * 
 * Arguments:
 * - category: String? - Filter by category name
 * - brand: String? - Filter by brand name
 * 
 * Results:
 * - None (navigation only)
 * 
 * @see ProductListViewModel For product data and state
 * @see ProductAdapter For grid rendering
 */
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
    private var searchJob: kotlinx.coroutines.Job? = null
    
    private fun setupSearchView() {
        binding.searchEditText.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                val query = s?.toString()?.trim() ?: ""
                
                // Cancel previous search job
                searchJob?.cancel()
                
                // Debounce search with 300ms delay
                searchJob = viewLifecycleOwner.lifecycleScope.launch {
                    kotlinx.coroutines.delay(300)
                    
                    when {
                        query.isBlank() -> viewModel.refreshProducts()
                        query.length >= 2 -> viewModel.searchProducts(query)
                    }
                }
            }
        })
        
        // Clear button functionality
        binding.searchEditText.setOnFocusChangeListener { _, hasFocus ->
            if (hasFocus && binding.searchEditText.text?.isNotEmpty() == true) {
                // Show clear button when focused and has text
            }
        }
    }

    private fun setupVoiceSearch() {
        binding.voiceButton.setOnClickListener {
            if (!hasAudioPermission()) {
                audioPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
            } else {
                viewModel.toggleVoiceRecording()
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
                binding.root.showErrorSnackbar(getString(R.string.filter_min_price_error))
                return@setOnClickListener
            }
            
            viewModel.setPriceRange(min, max)
            binding.clearFilterButton.visibility = if (min != null || max != null) View.VISIBLE else View.GONE
            binding.filterPanel.hide()
            
            if (min != null || max != null) {
                binding.root.showSuccessSnackbar(getString(R.string.filter_applied))
            }
        }
        
        binding.clearFilterButton.setOnClickListener {
            binding.minPriceInput.text?.clear()
            binding.maxPriceInput.text?.clear()
            binding.clearFilterButton.hide()
            viewModel.clearFilters()
            binding.root.showInfoSnackbar(getString(R.string.filter_cleared))
        }
    }

    private fun setupCategoryChips() {
        binding.categoryChipGroup.setOnCheckedStateChangeListener { _, checkedIds ->
            val category = when (checkedIds.firstOrNull()) {
                R.id.chipPhones -> "phone"
                R.id.chipLaptops -> "laptop"
                R.id.chipWearables -> "smartwatch"
                else -> null
            }
            viewModel.loadProducts(category)
        }
    }

    private fun setupSwipeRefresh() {
        binding.swipeRefreshLayout.apply {
            setColorSchemeColors(
                ContextCompat.getColor(requireContext(), R.color.mobi_pulse_primary),
                ContextCompat.getColor(requireContext(), R.color.mobi_pulse_primary_variant)
            )
            setOnRefreshListener {
                viewModel.refreshProducts()
            }
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
                    text = getString(R.string.no_products)
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

        viewModel.isRecording.observe(viewLifecycleOwner) { isRecording ->
            if (isRecording) {
                binding.voiceButton.setImageResource(R.drawable.ic_stop)
                binding.voiceButton.backgroundTintList = android.content.res.ColorStateList.valueOf(
                    ContextCompat.getColor(requireContext(), R.color.error)
                )
            } else {
                binding.voiceButton.setImageResource(R.drawable.ic_mic)
                binding.voiceButton.backgroundTintList = android.content.res.ColorStateList.valueOf(
                    ContextCompat.getColor(requireContext(), R.color.mobi_pulse_primary)
                )
            }
        }
    }

    private fun showLoginRequiredDialog() {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle(getString(R.string.login_to_continue))
            .setMessage(getString(R.string.login_to_add_cart))
            .setPositiveButton(getString(R.string.login)) { _, _ ->
                findNavController().navigate(R.id.action_global_login)
            }
            .setNegativeButton(getString(R.string.cancel), null)
            .show()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        searchJob?.cancel()
        _binding = null
    }
}
