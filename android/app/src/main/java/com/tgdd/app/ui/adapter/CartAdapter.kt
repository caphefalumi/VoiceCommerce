package com.tgdd.app.ui.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import coil.load
import com.tgdd.app.R
import com.tgdd.app.data.model.CartItemDto
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
 * Data Source: List of [CartItemDto] from cart API
 * Layout: R.layout.item_cart (product image, name, brand, price, quantity controls, line total)
 *
 * Features:
 * - Quantity adjustment buttons (+/-)
 * - Remove item button
 * - Async brand lookup via [ProductRepository]
 * - Real-time line total calculation
 *
 * View Binding: [ItemCartBinding] in [onCreateViewHolder]
 * Data Binding: CartItemDto properties bound in [CartViewHolder.bind]
 *
 * @see CartItemDto For item data model
 * @see R.layout.item_cart For item layout
 */
class CartAdapter(
    private val productRepository: ProductRepository,
    private val onQuantityChanged: (CartItemDto, Int) -> Unit,
    private val onRemoveClicked: (CartItemDto) -> Unit
) : ListAdapter<CartItemDto, CartAdapter.CartViewHolder>(CartItemDiffCallback()) {

    private val adapterScope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    override fun submitList(list: List<CartItemDto>?) {
        android.util.Log.d("CartAdapter", "submitList called with ${list?.size ?: 0} items")
        list?.forEach { item ->
            android.util.Log.d("CartAdapter", "  - ${item.name} (qty: ${item.quantity})")
        }
        super.submitList(list)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): CartViewHolder {
        val binding = ItemCartBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return CartViewHolder(binding)
    }

    override fun onBindViewHolder(holder: CartViewHolder, position: Int) {
        val item = getItem(position)
        android.util.Log.d("CartAdapter", "Binding item at position $position: ${item.name}")
        holder.bind(item)
    }

    inner class CartViewHolder(private val binding: ItemCartBinding) : RecyclerView.ViewHolder(binding.root) {
        @Suppress("DEPRECATION")
        fun bind(item: CartItemDto) {
            binding.apply {
                // Set index (position + 1)
                productIndex.text = (bindingAdapterPosition + 1).toString()
                
                // Set product name
                productName.text = item.name ?: "Product"
                
                // Set price
                productPrice.text = String.format(Locale("vi", "VN"), "%,.0f₫", item.price)
                
                // Set quantity
                quantityText.text = item.quantity.toString()

                // Remove button
                removeButton.setOnClickListener {
                    onRemoveClicked(item)
                }
            }
        }
    }
}

class CartItemDiffCallback : DiffUtil.ItemCallback<CartItemDto>() {
    override fun areItemsTheSame(oldItem: CartItemDto, newItem: CartItemDto): Boolean {
        return oldItem.productId == newItem.productId
    }

    override fun areContentsTheSame(oldItem: CartItemDto, newItem: CartItemDto): Boolean {
        return oldItem == newItem
    }
}
