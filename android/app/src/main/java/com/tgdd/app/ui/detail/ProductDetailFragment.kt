package com.tgdd.app.ui.detail

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import androidx.navigation.fragment.navArgs
import androidx.recyclerview.widget.LinearLayoutManager
import com.bumptech.glide.Glide
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.snackbar.Snackbar
import com.tgdd.app.R
import com.tgdd.app.databinding.FragmentProductDetailBinding
import com.tgdd.app.ui.adapter.ReviewAdapter
import dagger.hilt.android.AndroidEntryPoint
import java.text.NumberFormat
import java.util.Locale

@AndroidEntryPoint
class ProductDetailFragment : Fragment() {

    private var _binding: FragmentProductDetailBinding? = null
    private val binding get() = _binding!!
    private val viewModel: ProductDetailViewModel by viewModels()
    private val args: ProductDetailFragmentArgs by navArgs()
    private lateinit var reviewAdapter: ReviewAdapter
    private val vnd = NumberFormat.getNumberInstance(Locale("vi", "VN"))

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentProductDetailBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupToolbar()
        setupReviews()
        setupClickListeners()
        observeViewModel()
        viewModel.loadProduct(args.productId)
    }

    private fun setupToolbar() {
        binding.toolbar.setNavigationOnClickListener { findNavController().navigateUp() }
    }

    private fun setupReviews() {
        reviewAdapter = ReviewAdapter()
        binding.reviewsRecyclerView.layoutManager = LinearLayoutManager(requireContext())
        binding.reviewsRecyclerView.adapter = reviewAdapter
    }

    private fun setupClickListeners() {
        binding.addToCartButton.setOnClickListener {
            viewModel.product.value?.let { product ->
                val quantity = binding.quantityText.text.toString().toIntOrNull() ?: 1
                viewModel.addToCart(product, quantity)
            }
        }
        binding.increaseQuantityButton.setOnClickListener {
            val current = binding.quantityText.text.toString().toIntOrNull() ?: 1
            binding.quantityText.text = (current + 1).toString()
        }
        binding.decreaseQuantityButton.setOnClickListener {
            val current = binding.quantityText.text.toString().toIntOrNull() ?: 1
            if (current > 1) binding.quantityText.text = (current - 1).toString()
        }
    }

    private fun observeViewModel() {
        viewModel.product.observe(viewLifecycleOwner) { product ->
            product ?: return@observe
            binding.toolbar.title = product.name
            binding.productNameText.text = product.name
            binding.productPriceText.text = "${vnd.format(product.price)} VNĐ"
            binding.productDescriptionText.text = product.description
            binding.productRatingText.text = String.format("%.1f", product.rating)
            binding.productReviewsText.text = getString(R.string.reviews_format, product.reviewCount)
            binding.productBrand.text = product.brand ?: product.category
            binding.productRatingBar.rating = product.rating
            binding.stockBadge.text = if (product.inStock) "Còn hàng" else "Hết hàng"
            binding.stockBadge.setTextColor(if (product.inStock) 0xFF4CAF50.toInt() else 0xFFF44336.toInt())
            binding.quantityText.text = "1"
            Glide.with(this)
                .load(product.image)
                .placeholder(android.R.drawable.ic_menu_gallery)
                .into(binding.productImage)
        }

        viewModel.productDto.observe(viewLifecycleOwner) { dto ->
            dto ?: return@observe
            // Render specs
            val specs = dto.specs
            if (!specs.isNullOrEmpty()) {
                binding.specsContainer.removeAllViews()
                binding.specsContainer.visibility = View.VISIBLE
                specs.entries.forEachIndexed { index, entry ->
                    val row = layoutInflater.inflate(android.R.layout.simple_list_item_2, binding.specsContainer, false)
                    row.findViewById<TextView>(android.R.id.text1)?.apply {
                        text = entry.key
                        setTextColor(0xFF616161.toInt())
                        textSize = 12f
                    }
                    row.findViewById<TextView>(android.R.id.text2)?.apply {
                        text = entry.value
                        setTextColor(0xFF212121.toInt())
                        textSize = 14f
                    }
                    binding.specsContainer.addView(row)
                }
            }
            // Render reviews
            val reviews = dto.reviews
            if (!reviews.isNullOrEmpty()) {
                binding.reviewsRecyclerView.visibility = View.VISIBLE
                reviewAdapter.submitList(reviews)
            }
        }

        viewModel.isLoading.observe(viewLifecycleOwner) { loading ->
            binding.toolbar.alpha = if (loading) 0.5f else 1.0f
        }

        viewModel.addedToCart.observe(viewLifecycleOwner) { added ->
            if (added) {
                Snackbar.make(binding.root, getString(R.string.added_to_cart), Snackbar.LENGTH_SHORT)
                    .setAction(getString(R.string.view_cart)) {
                        findNavController().navigate(R.id.cartFragment)
                    }.show()
                viewModel.resetAddedToCart()
            }
        }

        viewModel.requireLogin.observe(viewLifecycleOwner) { required ->
            if (required == true) {
                showLoginRequiredDialog()
                viewModel.resetRequireLogin()
            }
        }

        viewModel.error.observe(viewLifecycleOwner) { error ->
            error?.let {
                Snackbar.make(binding.root, it, Snackbar.LENGTH_LONG).show()
                viewModel.clearError()
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
