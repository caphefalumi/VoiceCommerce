package com.tgdd.app.ui.chatbot

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.tgdd.app.databinding.ItemChatMessageBinding
import java.text.SimpleDateFormat
import java.util.*

class ChatMessageAdapter : ListAdapter<ChatMessage, ChatMessageAdapter.MessageViewHolder>(MessageDiffCallback()) {
    
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): MessageViewHolder {
        val binding = ItemChatMessageBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return MessageViewHolder(binding)
    }
    
    override fun onBindViewHolder(holder: MessageViewHolder, position: Int) {
        holder.bind(getItem(position))
    }
    
    class MessageViewHolder(
        private val binding: ItemChatMessageBinding
    ) : RecyclerView.ViewHolder(binding.root) {
        
        private val timeFormat = SimpleDateFormat("hh:mm a", Locale.getDefault())
        
        fun bind(message: ChatMessage) {
            val timeString = timeFormat.format(message.timestamp)
            
            when (message.role) {
                "user" -> {
                    binding.userMessageContainer.visibility = View.VISIBLE
                    binding.assistantMessageContainer.visibility = View.GONE
                    binding.tvUserMessage.text = message.content
                    binding.tvUserTime.text = timeString
                }
                "assistant" -> {
                    binding.userMessageContainer.visibility = View.GONE
                    binding.assistantMessageContainer.visibility = View.VISIBLE
                    binding.tvAssistantMessage.text = message.content
                    binding.tvAssistantTime.text = timeString
                }
            }
        }
    }
    
    private class MessageDiffCallback : DiffUtil.ItemCallback<ChatMessage>() {
        override fun areItemsTheSame(oldItem: ChatMessage, newItem: ChatMessage): Boolean {
            return oldItem.id == newItem.id
        }
        
        override fun areContentsTheSame(oldItem: ChatMessage, newItem: ChatMessage): Boolean {
            return oldItem == newItem
        }
    }
}
