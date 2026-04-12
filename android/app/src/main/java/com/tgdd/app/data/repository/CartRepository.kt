package com.tgdd.app.data.repository

import android.util.Log
import com.tgdd.app.data.local.dao.CartDao
import com.tgdd.app.data.local.entity.CartItemEntity
import com.tgdd.app.data.local.entity.ProductEntity
import com.tgdd.app.data.model.CartItemDto
import com.tgdd.app.data.network.NetworkObserver
import com.tgdd.app.data.remote.CartApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import javax.inject.Inject

class CartRepository @Inject constructor(
    private val cartDao: CartDao,
    private val cartApi: CartApi,
    private val userSession: com.tgdd.app.data.local.UserSession
) {
    fun getCartItems(): Flow<List<CartItemEntity>> = cartDao.getCartItems()

    fun getAllCartItems(): Flow<List<CartItemEntity>> = cartDao.getCartItems()

    fun getCartItemCount(): Flow<Int> = cartDao.getCartItemCount().map { it ?: 0 }

    fun getCartTotal(): Flow<Double> = cartDao.getCartTotal().map { it ?: 0.0 }

    fun calculateItemTotal(item: CartItemEntity): Double {
        return item.price * item.quantity
    }

    suspend fun addToCart(product: ProductEntity) {
        val cartItem = CartItemEntity(
            productId = product.id,
            name = product.name,
            image = product.image,
            price = product.price,
            quantity = 1
        )
        val existingItem = cartDao.getCartItemByProductId(product.id)
        if (existingItem != null) {
            val updatedItem = existingItem.copy(quantity = existingItem.quantity + 1)
            cartDao.updateCartItem(updatedItem)
        } else {
            cartDao.insertCartItem(cartItem)
        }
        // Sync to server
        syncAddToCart(product.id, 1)
    }

    suspend fun addToCart(item: CartItemEntity) {
        val existingItem = cartDao.getCartItemByProductId(item.productId)
        if (existingItem != null) {
            val updatedItem = existingItem.copy(quantity = existingItem.quantity + item.quantity)
            cartDao.updateCartItem(updatedItem)
        } else {
            cartDao.insertCartItem(item)
        }
        // Sync to server
        syncAddToCart(item.productId, item.quantity)
    }

    suspend fun updateCartItem(item: CartItemEntity) {
        cartDao.updateCartItem(item)
    }

    suspend fun updateQuantity(itemId: Long, quantity: Int) {
        val items = getCartItems().first()
        val item = items.find { it.id == itemId }
        if (quantity < 1) {
            cartDao.removeCartItemById(itemId)
            item?.let { syncRemoveFromCart(it.productId) }
        } else {
            cartDao.updateQuantity(itemId, quantity)
            item?.let { syncSetQuantity(it.productId, quantity) }
        }
    }

    suspend fun removeFromCart(itemId: Long) {
        // Get the productId before deleting so we can sync with server
        val items = getCartItems().first()
        val item = items.find { it.id == itemId }
        cartDao.removeCartItemById(itemId)
        item?.let { syncRemoveFromCart(it.productId) }
    }

    suspend fun removeFromCart(item: CartItemEntity) {
        cartDao.deleteCartItem(item)
        syncRemoveFromCart(item.productId)
    }

    suspend fun removeByProductId(productId: String) {
        cartDao.removeCartItemByProductId(productId)
        syncRemoveFromCart(productId)
    }

    suspend fun clearCart() {
        cartDao.clearCart()
    }

    private suspend fun syncAddToCart(productId: String, quantity: Int) {
        if (!userSession.isLoggedIn()) return
        if (!NetworkObserver.isCurrentlyConnected()) return
        try {
            val dto = mapOf("product_id" to productId, "quantity" to quantity)
            val response = cartApi.addToCart(dto)
            if (!response.isSuccessful) {
                Log.e(TAG, "Add to cart sync failed: ${response.code()}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Add to cart sync failed: ${e.message}", e)
        }
    }

    private suspend fun syncRemoveFromCart(productId: String) {
        if (!userSession.isLoggedIn()) return
        if (!NetworkObserver.isCurrentlyConnected()) return
        try {
            val response = cartApi.removeFromCart(productId)
            if (!response.isSuccessful) {
                Log.e(TAG, "Remove from cart sync failed: ${response.code()}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Remove from cart sync failed: ${e.message}", e)
        }
    }

    private suspend fun syncSetQuantity(productId: String, quantity: Int) {
        if (!userSession.isLoggedIn()) return
        if (!NetworkObserver.isCurrentlyConnected()) return
        try {
            val response = cartApi.setCartQuantity(productId, mapOf("quantity" to quantity))
            if (!response.isSuccessful) {
                Log.e(TAG, "Set quantity sync failed: ${response.code()}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Set quantity sync failed: ${e.message}", e)
        }
    }

    suspend fun syncCart() {
        if (!userSession.isLoggedIn()) return
        if (!NetworkObserver.isCurrentlyConnected()) {
            Log.w(TAG, "Cannot sync cart: no network connection")
            return
        }
        try {
            val response = cartApi.getCart()
            if (response.isSuccessful) {
                response.body()?.cart?.let { items ->
                    val entities = items.map { it.toEntity() }
                    cartDao.clearCart()
                    entities.forEach { cartDao.insertCartItem(it) }
                    Log.d(TAG, "Cart synced: ${items.size} items")
                }
            } else {
                Log.e(TAG, "Cart sync failed: ${response.code()}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Cart sync failed: ${e.message}", e)
        }
    }

    companion object {
        private const val TAG = "CartRepository"
    }
}

fun CartItemEntity.toDto(): CartItemDto {
    return CartItemDto(
        productId = productId,
        name = name,
        images = listOf(image),
        price = price,
        quantity = quantity
    )
}

fun CartItemDto.toEntity(): CartItemEntity {
    return CartItemEntity(
        id = 0,
        productId = this.productId ?: "",
        name = this.name ?: "",
        image = this.getImage(),
        price = this.price,
        quantity = this.quantity
    )
}
