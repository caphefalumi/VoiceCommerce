package com.tgdd.app.ui.category

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.google.android.material.snackbar.Snackbar
import com.tgdd.app.R
import com.tgdd.app.databinding.FragmentCategoryBinding
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class CategoryFragment : Fragment() {

    private var _binding: FragmentCategoryBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentCategoryBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupCategoryClicks()
        setupBrandClicks()
        setupViewAllButton()
        setupPromoCards()
    }

    private fun setupCategoryClicks() {
        binding.cardCategoryPhones.setOnClickListener {
            navigateToProductList(category = "Điện thoại")
        }
        binding.cardCategoryLaptops.setOnClickListener {
            navigateToProductList(category = "Laptop")
        }
        binding.cardCategoryTablets.setOnClickListener {
            navigateToProductList(category = "Máy tính bảng")
        }
        binding.cardCategoryAccessories.setOnClickListener {
            navigateToProductList(category = "Phụ kiện")
        }
        binding.cardCategorySamsung.setOnClickListener {
            navigateToProductList(category = "Samsung")
        }
        binding.cardCategoryApple.setOnClickListener {
            navigateToProductList(category = "Apple")
        }
    }

    private fun setupBrandClicks() {
        binding.cardBrandApple.setOnClickListener {
            navigateToProductList(category = null, brand = "Apple")
        }
        binding.cardBrandSamsung.setOnClickListener {
            navigateToProductList(category = null, brand = "Samsung")
        }
        binding.cardBrandOppo.setOnClickListener {
            navigateToProductList(category = null, brand = "Oppo")
        }
        binding.cardBrandXiaomi.setOnClickListener {
            navigateToProductList(category = null, brand = "Xiaomi")
        }
        binding.textSeeAllBrands.setOnClickListener {
            navigateToProductList(category = null, brand = null)
        }
    }

    private fun setupViewAllButton() {
        binding.btnViewAllCategories.setOnClickListener {
            navigateToProductList(category = null)
        }
    }

    private fun setupPromoCards() {
        binding.cardPromoIFans.setOnClickListener {
            navigateToProductList(category = "iPhone")
        }
        binding.cardProductAppleWatch.setOnClickListener {
            navigateToProductList(category = "Apple Watch")
        }
        binding.cardProductMacBook.setOnClickListener {
            navigateToProductList(category = "MacBook")
        }
    }

    private fun navigateToProductList(category: String?, brand: String? = null) {
        val action = CategoryFragmentDirections.actionCategoryToProductList(category, brand)
        findNavController().navigate(action)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
