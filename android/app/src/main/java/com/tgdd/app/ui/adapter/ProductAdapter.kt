package com.tgdd.app.ui.adapter

import android.graphics.Paint
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import coil.load
import coil.transform.RoundedCornersTransformation
import com.tgdd.app.R
import com.tgdd.app.data.local.entity.ProductEntity
import com.tgdd.app.databinding.ItemProductGridBinding
import java.text.NumberFormat
import java.util.Locale

class ProductAdapter(
    private val onProductClick: (ProductEntity) -> Unit,
    private val onAddToCart: ((ProductEntity) -> Unit)? = null
) : ListAdapter<ProductEntity, ProductAdapter.ViewHolder>(DIFF) {

    private val vnd = NumberFormat.getNumberInstance(Locale("vi", "VN"))

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemProductGridBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) = holder.bind(getItem(position))

    inner class ViewHolder(private val b: ItemProductGridBinding) : RecyclerView.ViewHolder(b.root) {

        init {
            b.root.setOnClickListener {
                val pos = bindingAdapterPosition
                if (pos != RecyclerView.NO_POSITION) onProductClick(getItem(pos))
            }
            b.addToCartButton.setOnClickListener {
                val pos = bindingAdapterPosition
                if (pos != RecyclerView.NO_POSITION) onAddToCart?.invoke(getItem(pos))
            }
        }

        fun bind(product: ProductEntity) {
            b.productName.text = product.name
            b.productPrice.text = "${vnd.format(product.price)} ₫"
            b.productRating.rating = product.rating
            
            // Show rating value
            b.ratingValue.text = String.format(Locale.US, "%.1f", product.rating)
            b.reviewCount.text = if (product.reviewCount > 0) "(${product.reviewCount})" else ""

            // Original price strikethrough
            if (product.originalPrice != null && product.originalPrice > product.price) {
                b.originalPrice.visibility = View.VISIBLE
                b.originalPrice.text = "${vnd.format(product.originalPrice)} ₫"
                b.originalPrice.paintFlags = b.originalPrice.paintFlags or Paint.STRIKE_THRU_TEXT_FLAG
                val pct = ((product.originalPrice - product.price) / product.originalPrice * 100).toInt()
                b.discountBadge.visibility = View.VISIBLE
                b.discountBadge.text = "-$pct%"
            } else {
                b.originalPrice.visibility = View.GONE
                b.discountBadge.visibility = View.GONE
            }

            // New badge
            b.newBadge.visibility = View.GONE

            // Load image with Coil
            b.productImage.load(product.image) {
                crossfade(true)
                placeholder(R.drawable.placeholder_product)
                error(R.drawable.placeholder_product)
                transformations(RoundedCornersTransformation(16f))
                size(400, 400)
            }
        }
    }

    companion object {
        val DIFF = object : DiffUtil.ItemCallback<ProductEntity>() {
            override fun areItemsTheSame(a: ProductEntity, b: ProductEntity) = a.id == b.id
            override fun areContentsTheSame(a: ProductEntity, b: ProductEntity) = a == b
        }
    }
}
