package com.tgdd.app.ui.orders

import android.graphics.Color
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.tgdd.app.data.local.entity.OrderEntity
import com.tgdd.app.databinding.ItemOrderBinding
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class OrdersAdapter : ListAdapter<OrderEntity, OrdersAdapter.ViewHolder>(DIFF) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemOrderBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) = holder.bind(getItem(position))

    class ViewHolder(private val b: ItemOrderBinding) : RecyclerView.ViewHolder(b.root) {
        private val vnd = NumberFormat.getNumberInstance(Locale("vi", "VN"))

        fun bind(order: OrderEntity) {
            b.orderIdText.text = "#${order.id.take(8).uppercase()}"
            b.orderAddressText.text = order.address.ifBlank { "—" }
            b.orderTotalText.text = "${vnd.format(order.total)} ₫"

            // Date — createdAt is millis stored as Long
            try {
                val sdf = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale("vi"))
                b.orderDateText.text = sdf.format(Date(order.createdAt))
            } catch (_: Exception) {
                b.orderDateText.text = ""
            }

            val (label, bgColor, textColor) = when (order.status) {
                "delivered"  -> Triple("Đã giao",       "#E8F5E9", "#2E7D32")
                "shipped"    -> Triple("Đang giao",     "#E3F2FD", "#1565C0")
                "preparing"  -> Triple("Đang chuẩn bị","#FFF8E1", "#E65100")
                "cancelled"  -> Triple("Đã hủy",        "#FFEBEE", "#C62828")
                else         -> Triple("Chờ xử lý",     "#F3F4F6", "#374151")
            }
            b.orderStatusText.text = label
            b.orderStatusText.setBackgroundColor(Color.parseColor(bgColor))
            b.orderStatusText.setTextColor(Color.parseColor(textColor))
        }
    }

    companion object {
        val DIFF = object : DiffUtil.ItemCallback<OrderEntity>() {
            override fun areItemsTheSame(a: OrderEntity, b: OrderEntity) = a.id == b.id
            override fun areContentsTheSame(a: OrderEntity, b: OrderEntity) = a == b
        }
    }
}
