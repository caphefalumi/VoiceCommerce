package com.tgdd.app.ui.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.tgdd.app.R
import com.tgdd.app.data.local.entity.CartItemEntity
import com.tgdd.app.databinding.ItemCartBinding

class CartAdapter(
    private val onQuantityChanged: (CartItemEntity, Int) -> Unit,
    private val onRemoveClicked: (CartItemEntity) -> Unit
) : ListAdapter<CartItemEntity, CartAdapter.CartViewHolder>(CartItemDiffCallback()) {

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
                productPrice.text = String.format("%,.0f₫", item.price)
                quantityText.text = item.quantity.toString()
                
                Glide.with(productImage)
                    .load(item.image)
                    .placeholder(R.drawable.ic_placeholder)
                    .into(productImage)

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
