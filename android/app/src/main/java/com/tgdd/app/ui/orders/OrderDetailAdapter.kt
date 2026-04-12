package com.tgdd.app.ui.orders

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import coil.load
import com.tgdd.app.R
import com.tgdd.app.databinding.ItemOrderDetailBinding
import java.text.NumberFormat
import java.util.Locale

class OrderDetailAdapter : ListAdapter<OrderItemUi, OrderDetailAdapter.ViewHolder>(DIFF) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemOrderDetailBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) = holder.bind(getItem(position))

    class ViewHolder(private val b: ItemOrderDetailBinding) : RecyclerView.ViewHolder(b.root) {
        @Suppress("DEPRECATION")
        private val vnd = NumberFormat.getNumberInstance(Locale("vi", "VN"))

        fun bind(item: OrderItemUi) {
            b.itemImage.load(item.image) {
                placeholder(R.drawable.ic_placeholder)
                error(R.drawable.ic_placeholder)
            }
            b.itemNameText.text = item.name
            b.itemQuantityText.text = "x${item.quantity}"
            b.itemPriceText.text = "${vnd.format(item.price * item.quantity)} ₫"
        }
    }

    companion object {
        val DIFF = object : DiffUtil.ItemCallback<OrderItemUi>() {
            override fun areItemsTheSame(a: OrderItemUi, b: OrderItemUi) = a.name == b.name && a.quantity == b.quantity
            override fun areContentsTheSame(a: OrderItemUi, b: OrderItemUi) = a == b
        }
    }
}