package com.tgdd.app.ui.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.tgdd.app.data.model.ReviewDto
import com.tgdd.app.databinding.ItemReviewBinding

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
            binding.reviewUserName.text = review.userName
            binding.reviewRating.rating = review.rating
            binding.reviewComment.text = review.comment
        }
    }

    companion object {
        val DIFF = object : DiffUtil.ItemCallback<ReviewDto>() {
            override fun areItemsTheSame(a: ReviewDto, b: ReviewDto) = a.id == b.id
            override fun areContentsTheSame(a: ReviewDto, b: ReviewDto) = a == b
        }
    }
}
