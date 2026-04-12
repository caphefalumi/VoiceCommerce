package com.tgdd.app.ui.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import coil.load
import com.tgdd.app.R
import com.tgdd.app.data.local.entity.CartItemEntity
import com.tgdd.app.data.repository.ProductRepository
import com.tgdd.app.databinding.ItemCartBinding
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.Locale

/**
 * RecyclerView Adapter for displaying cart items in a list.
 *
 * Data Source: List of [CartItemEntity] from cart repository
 * Layout: R.layout.item_cart (product image, name, brand, price, quantity controls, line total)
 *
 * Features:
 * - Quantity adjustment buttons (+/-)
 * - Remove item button
 * - Async brand lookup via [ProductRepository]
 * - Real-time line total calculation
 *
 * View Binding: [ItemCartBinding] in [onCreateViewHolder]
 * Data Binding: CartItemEntity properties bound in [CartViewHolder.bind]
 *
 * @see CartItemEntity For item data model
 * @see R.layout.item_cart For item layout
 */
class CartAdapter(
    private val productRepository: ProductRepository,
    private val onQuantityChanged: (CartItemEntity, Int) -> Unit,
    private val onRemoveClicked: (CartItemEntity) -> Unit
) : ListAdapter<CartItemEntity, CartAdapter.CartViewHolder>(CartItemDiffCallback()) {

    private val adapterScope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): CartViewHolder {
        val binding = ItemCartBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return CartViewHolder(binding)
    }

    override fun onBindViewHolder(holder: CartViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    inner class CartViewHolder(private val binding: ItemCartBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(item: CartItemEntity) {
            binding.apply {
                productName.text = item.name
                productPrice.text = String.format(Locale("vi", "VN"), "%,.0f₫", item.price)
                lineTotalText.text = root.context.getString(
                    R.string.line_total_format,
                    String.format(Locale("vi", "VN"), "%,.0f₫", item.price * item.quantity)
                )
                quantityText.text = item.quantity.toString()

                productBrand.text = root.context.getString(R.string.brand_unknown)
                adapterScope.launch {
                    val product = withContext(Dispatchers.IO) {
                        runCatching { productRepository.getProductById(item.productId).getOrNull() }.getOrNull()
                    }
                    if (bindingAdapterPosition != RecyclerView.NO_POSITION) {
                        productBrand.text = product?.brand?.takeIf { it.isNotBlank() }
                            ?: root.context.getString(R.string.brand_unknown)
                    }
                }
                
                productImage.load(item.image) {
                    placeholder(R.drawable.ic_placeholder)
                    error(R.drawable.ic_placeholder)
                }

                increaseButton.setOnClickListener {
                    onQuantityChanged(item, item.quantity + 1)
                }

                decreaseButton.setOnClickListener {
                    if (item.quantity > 1) {
                        onQuantityChanged(item, item.quantity - 1)
                    } else {
                        onRemoveClicked(item)
                    }
                }

                removeButton.setOnClickListener {
                    onRemoveClicked(item)
                }
            }
        }
    }
}

class CartItemDiffCallback : DiffUtil.ItemCallback<CartItemEntity>() {
    override fun areItemsTheSame(oldItem: CartItemEntity, newItem: CartItemEntity): Boolean {
        return oldItem.id == newItem.id
    }

    override fun areContentsTheSame(oldItem: CartItemEntity, newItem: CartItemEntity): Boolean {
        return oldItem == newItem
    }
}
