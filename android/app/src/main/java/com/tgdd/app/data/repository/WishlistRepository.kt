package com.tgdd.app.data.repository

import android.util.Log
import com.tgdd.app.data.local.dao.WishlistDao
import com.tgdd.app.data.local.entity.ProductEntity
import com.tgdd.app.data.local.entity.WishlistEntity
import com.tgdd.app.data.network.NetworkObserver
import com.tgdd.app.data.remote.WishlistApi
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class WishlistRepository @Inject constructor(
    private val wishlistDao: WishlistDao,
    private val wishlistApi: WishlistApi,
    private val userSession: com.tgdd.app.data.local.UserSession
) {
    fun getAllWishlistItems(): Flow<List<WishlistEntity>> = wishlistDao.getAllWishlistItems()

    fun getWishlistCount(): Flow<Int> = wishlistDao.getWishlistCount()

    fun isInWishlist(productId: String): Flow<Boolean> = wishlistDao.isInWishlist(productId)

    suspend fun addToWishlist(product: ProductEntity) {
        val wishlistItem = WishlistEntity(
            productId = product.id,
            name = product.name,
            image = product.image,
            price = product.price,
            originalPrice = product.originalPrice,
            rating = product.rating.toDouble()
        )
        wishlistDao.insertWishlistItem(wishlistItem)
        syncAddToWishlist(product.id)
    }

    suspend fun removeFromWishlist(productId: String) {
        wishlistDao.deleteByProductId(productId)
        syncRemoveFromWishlist(productId)
    }

    suspend fun toggleWishlist(product: ProductEntity): Boolean {
        val existing = wishlistDao.getWishlistItemByProductId(product.id)
        return if (existing != null) {
            removeFromWishlist(product.id)
            false
        } else {
            addToWishlist(product)
            true
        }
    }

    suspend fun clearWishlist() {
        wishlistDao.clearWishlist()
    }

    private suspend fun syncAddToWishlist(productId: String) {
        if (!userSession.isLoggedIn()) return
        if (!NetworkObserver.isCurrentlyConnected()) return
        try {
            val response = wishlistApi.addToWishlist(mapOf("product_id" to productId))
            if (!response.isSuccessful) {
                Log.e(TAG, "Add to wishlist sync failed: ${response.code()}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Add to wishlist sync failed: ${e.message}", e)
        }
    }

    private suspend fun syncRemoveFromWishlist(productId: String) {
        if (!userSession.isLoggedIn()) return
        if (!NetworkObserver.isCurrentlyConnected()) return
        try {
            val response = wishlistApi.removeFromWishlist(productId)
            if (!response.isSuccessful) {
                Log.e(TAG, "Remove from wishlist sync failed: ${response.code()}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Remove from wishlist sync failed: ${e.message}", e)
        }
    }

    suspend fun syncWishlist() {
        if (!userSession.isLoggedIn()) return
        if (!NetworkObserver.isCurrentlyConnected()) {
            Log.w(TAG, "Cannot sync wishlist: no network connection")
            return
        }
        try {
            val response = wishlistApi.getWishlist()
            if (response.isSuccessful) {
                response.body()?.wishlist?.let { products ->
                    val entities = products.map { product ->
                        WishlistEntity(
                            productId = product.id,
                            name = product.name,
                            image = product.getFirstImage(),
                            price = product.price,
                            originalPrice = product.originalPrice,
                            rating = product.rating.toDouble()
                        )
                    }
                    wishlistDao.clearWishlist()
                    entities.forEach { wishlistDao.insertWishlistItem(it) }
                    Log.d(TAG, "Wishlist synced: ${products.size} items")
                }
            } else {
                Log.e(TAG, "Wishlist sync failed: ${response.code()}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Wishlist sync failed: ${e.message}", e)
        }
    }

    companion object {
        private const val TAG = "WishlistRepository"
    }
}
