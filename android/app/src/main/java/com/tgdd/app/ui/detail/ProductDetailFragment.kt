package com.tgdd.app.ui.detail

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import androidx.navigation.fragment.navArgs
import androidx.recyclerview.widget.LinearLayoutManager
import coil.load
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.snackbar.Snackbar
import com.tgdd.app.R
import com.tgdd.app.data.model.ReviewDto
import com.tgdd.app.databinding.FragmentProductDetailBinding
import com.tgdd.app.ui.adapter.ReviewAdapter
import dagger.hilt.android.AndroidEntryPoint
import java.text.NumberFormat
import java.util.Locale

/**
 * Fragment displaying detailed product information with reviews.
 * 
 * Navigation:
 * - FROM: ProductListFragment, SearchFragment
 * - TO: CartFragment (on add to cart via global action)
 * 
 * Arguments:
 * - productId: String - Product identifier
 * 
 * Results:
 * - None (adds to cart, navigates to cart on action)
 * 
 * @see ProductDetailViewModel For product data and cart operations
 */
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
            binding.productRatingText.text = String.format(Locale.US, "%.1f", product.rating)
            binding.productReviewsText.text = getString(R.string.reviews_format, product.reviewCount)
            binding.productBrand.text = product.brand ?: product.category
            binding.productRatingBar.rating = product.rating
            binding.stockBadge.text = if (product.inStock) getString(R.string.in_stock) else getString(R.string.out_of_stock)
            binding.stockBadge.setTextColor(
                if (product.inStock) ContextCompat.getColor(requireContext(), R.color.mobi_pulse_tertiary)
                else ContextCompat.getColor(requireContext(), R.color.mobi_pulse_error)
            )
            binding.quantityText.text = getString(R.string.default_quantity_text)
            binding.productImage.load(product.image) {
                placeholder(android.R.drawable.ic_menu_gallery)
                error(android.R.drawable.ic_menu_gallery)
            }
        }

        viewModel.productDto.observe(viewLifecycleOwner) { dto ->
            dto ?: return@observe
            // Render specs
            val specs = dto.specs
            if (!specs.isNullOrEmpty()) {
                binding.specsContainer.removeAllViews()
                binding.specsContainer.visibility = View.VISIBLE
                specs.entries.forEach { entry ->
                    val row = layoutInflater.inflate(android.R.layout.simple_list_item_2, binding.specsContainer, false)
                    row.findViewById<TextView>(android.R.id.text1)?.apply {
                        text = entry.key
                        setTextColor(ContextCompat.getColor(requireContext(), R.color.mobi_pulse_on_surface_variant))
                        textSize = 12f
                    }
                    row.findViewById<TextView>(android.R.id.text2)?.apply {
                        text = entry.value
                        setTextColor(ContextCompat.getColor(requireContext(), R.color.mobi_pulse_on_surface))
                        textSize = 14f
                    }
                    binding.specsContainer.addView(row)
                }
            }

            // Prefer latest API worker aggregate fields when available.
            binding.productRatingText.text = String.format(Locale.US, "%.1f", dto.rating)
            binding.productReviewsText.text = getString(R.string.reviews_format, dto.reviewCount)
            binding.productRatingBar.rating = dto.rating
        }

        viewModel.reviews.observe(viewLifecycleOwner) { reviews ->
            val dtoReviews = reviews.map { review ->
                ReviewDto(
                    id = review.id,
                    productId = review.productId,
                    userId = review.userId,
                    userName = review.userName,
                    rating = review.rating,
                    comment = review.comment,
                    images = emptyList(),
                    helpfulCount = review.helpfulCount,
                    createdAt = review.createdAt.toString(),
                    isVerifiedPurchase = review.isVerifiedPurchase,
                )
            }
            reviewAdapter.submitList(dtoReviews)
            binding.reviewsRecyclerView.visibility = if (dtoReviews.isNotEmpty()) View.VISIBLE else View.GONE
        }

        viewModel.averageRating.observe(viewLifecycleOwner) { avg ->
            val avgFloat = avg.toFloat()
            binding.productRatingText.text = String.format(Locale.US, "%.1f", avgFloat)
            binding.productRatingBar.rating = avgFloat
        }

        viewModel.reviewCount.observe(viewLifecycleOwner) { count ->
            binding.productReviewsText.text = getString(R.string.reviews_format, count)
        }

        viewModel.isLoading.observe(viewLifecycleOwner) { loading ->
            binding.toolbar.alpha = if (loading) 0.5f else 1.0f
        }

        viewModel.addedToCart.observe(viewLifecycleOwner) { added ->
            if (added) {
                val message = viewModel.addedToCartMessage.value ?: getString(R.string.added_to_cart)
                Snackbar.make(binding.root, message, Snackbar.LENGTH_SHORT)
                    .setAction(getString(R.string.view_cart)) {
                        val action = ProductDetailFragmentDirections.actionGlobalCart(showBackButton = true)
                        findNavController().navigate(action)
                    }.show()
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

        viewModel.error.observe(viewLifecycleOwner) { error ->
            error?.let {
                Snackbar.make(binding.root, it, Snackbar.LENGTH_LONG).show()
                viewModel.clearError()
            }
        }
    }

    private fun showLoginRequiredDialog() {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle(getString(R.string.login_to_continue_title))
            .setMessage(getString(R.string.login_to_continue_message))
            .setPositiveButton(getString(R.string.login)) { _, _ ->
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
