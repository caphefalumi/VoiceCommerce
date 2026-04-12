package com.tgdd.app.ui.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.tgdd.app.data.model.ReviewDto
import com.tgdd.app.databinding.ItemReviewBinding

/**
 * RecyclerView Adapter for displaying product reviews in a list.
 *
 * Data Source: List of [ReviewDto] from API
 * Layout: R.layout.item_review (user name, rating stars, comment)
 *
 * Features:
 * - Display reviewer name (defaults to "Ẩn danh" if blank)
 * - Rating stars display
 * - Review comment (defaults to empty if blank)
 * - Read-only (no click listeners)
 *
 * View Binding: [ItemReviewBinding] in [onCreateViewHolder]
 * Data Binding: ReviewDto properties bound in [ViewHolder.bind]
 *
 * @see ReviewDto For item data model
 * @see R.layout.item_review For item layout
 */
class ReviewAdapter : ListAdapter<ReviewDto, ReviewAdapter.ViewHolder>(DIFF) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemReviewBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    class ViewHolder(private val binding: ItemReviewBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(review: ReviewDto) {
            binding.reviewUserName.text = review.userName?.ifBlank { "Ẩn danh" } ?: "Ẩn danh"
            binding.reviewRating.rating = review.rating.toFloat()
            binding.reviewComment.text = review.comment?.ifBlank { "" } ?: ""
        }
    }

    companion object {
        val DIFF = object : DiffUtil.ItemCallback<ReviewDto>() {
            override fun areItemsTheSame(a: ReviewDto, b: ReviewDto) = a.id == b.id
            override fun areContentsTheSame(a: ReviewDto, b: ReviewDto) = a == b
        }
    }
}
