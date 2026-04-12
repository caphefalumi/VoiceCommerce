package com.tgdd.app.ui.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.tgdd.app.data.model.CartItemDto
import com.tgdd.app.databinding.ItemOrderSummaryBinding

/**
 * Simplified adapter for displaying cart items in the order summary section.
 * Shows only index, product name, and remove button.
 */
class OrderSummaryAdapter(
    private val onRemoveClicked: (CartItemDto) -> Unit
) : ListAdapter<CartItemDto, OrderSummaryAdapter.OrderSummaryViewHolder>(CartItemDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): OrderSummaryViewHolder {
        val binding = ItemOrderSummaryBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return OrderSummaryViewHolder(binding)
    }

    override fun onBindViewHolder(holder: OrderSummaryViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    inner class OrderSummaryViewHolder(
        private val binding: ItemOrderSummaryBinding
    ) : RecyclerView.ViewHolder(binding.root) {
        
        fun bind(item: CartItemDto) {
            binding.apply {
                // Set index (position + 1)
                productIndex.text = (bindingAdapterPosition + 1).toString()
                
                // Set product name
                productName.text = item.name ?: "Product"

                // Remove button
                removeButton.setOnClickListener {
                    onRemoveClicked(item)
                }
            }
        }
    }
}
