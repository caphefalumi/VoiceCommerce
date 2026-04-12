package com.tgdd.app.data.repository

import android.util.Log
import com.tgdd.app.data.model.AddToCartRequest
import com.tgdd.app.data.model.CartItemDto
import com.tgdd.app.data.model.UpdateCartQuantityRequest
import com.tgdd.app.data.network.NetworkObserver
import com.tgdd.app.data.remote.CartApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map
import javax.inject.Inject

/**
 * Repository for shopping cart data with API-only strategy.
 * 
 * Data Source Strategy: API-only (no local caching)
 * 
 * ## Read Flow (API-First):
 * 1. Always fetch from API
 * 2. UI observes StateFlow for reactive updates
 * 3. Requires network connection for all operations
 * 
 * ## Write Flow (Direct API):
 * 1. Write directly to API
 * 2. Refresh cart data after successful write
 * 3. All operations require authentication
 * 
 * ## Caching Mechanism:
 * - In-memory StateFlow for current session only
 * - No persistent storage
 * - Cart data cleared on app restart
 * 
 * @see CartApi For API operations
 */
class CartRepository @Inject constructor(
    private val cartApi: CartApi,
    private val userSession: com.tgdd.app.data.local.UserSession
) {
    private val _cartItems = MutableStateFlow<List<CartItemDto>>(emptyList())
    private val _isLoading = MutableStateFlow(false)
    private val _error = MutableStateFlow<String?>(null)

    /**
     * Observes cart items as a reactive stream.
     * 
     * @return Flow emitting current cart items list
     */
    fun getCartItems(): Flow<List<CartItemDto>> = _cartItems

    /**
     * Alias for getCartItems() - returns all cart items.
     */
    fun getAllCartItems(): Flow<List<CartItemDto>> = _cartItems

    /**
     * Observes cart item count.
     * 
     * @return Flow emitting total number of items in cart
     */
    fun getCartItemCount(): Flow<Int> = _cartItems.map { items ->
        items.sumOf { it.quantity }
    }

    /**
     * Observes cart total price.
     * 
     * @return Flow emitting sum of (price * quantity) for all items
     */
    fun getCartTotal(): Flow<Double> = _cartItems.map { items ->
        items.sumOf { it.price * it.quantity }
    }

    /**
     * Calculates total price for a single cart item.
     * 
     * @param item Cart item to calculate total for
     * @return item.price * item.quantity
     */
    fun calculateItemTotal(item: CartItemDto): Double {
        return item.price * item.quantity
    }

    /**
     * Adds a product to cart via API.
     * 
     * @param productId Product ID to add
     * @param quantity Quantity to add (default: 1)
     */
    suspend fun addToCart(productId: String, quantity: Int = 1): Result<Unit> {
        Log.d(TAG, "addToCart called: productId=$productId, quantity=$quantity")
        
        if (!userSession.isLoggedIn()) {
            Log.e(TAG, "User not logged in")
            return Result.failure(Exception("User not logged in"))
        }
        if (!NetworkObserver.isCurrentlyConnected()) {
            Log.e(TAG, "No network connection")
            return Result.failure(Exception("No network connection"))
        }

        return try {
            _isLoading.value = true
            val request = AddToCartRequest(productId = productId, quantity = quantity)
            Log.d(TAG, "Calling API addToCart with: $request")
            val response = cartApi.addToCart(request)
            
            Log.d(TAG, "API response: code=${response.code()}, success=${response.isSuccessful}")
            
            if (response.isSuccessful) {
                Log.d(TAG, "Add to cart successful, refreshing cart...")
                // Refresh cart after adding to get updated cart state
                val refreshResult = refreshCart()
                if (refreshResult.isSuccess) {
                    Log.d(TAG, "Cart refresh successful")
                    Result.success(Unit)
                } else {
                    // Cart was added but refresh failed - still consider it success
                    Log.w(TAG, "Cart refresh failed after add: ${refreshResult.exceptionOrNull()?.message}")
                    Result.success(Unit)
                }
            } else {
                val errorMsg = "Failed to add to cart: ${response.code()} - ${response.message()}"
                Log.e(TAG, errorMsg)
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Add to cart exception: ${e.message}", e)
            Result.failure(e)
        } finally {
            _isLoading.value = false
        }
    }

    /**
     * Updates quantity for a cart item by product ID.
     * Removes item if quantity < 1.
     * 
     * @param productId Product ID
     * @param quantity New quantity (removes if < 1)
     */
    suspend fun updateQuantity(productId: String, quantity: Int): Result<Unit> {
        if (!userSession.isLoggedIn()) {
            return Result.failure(Exception("User not logged in"))
        }
        if (!NetworkObserver.isCurrentlyConnected()) {
            return Result.failure(Exception("No network connection"))
        }

        return try {
            _isLoading.value = true
            
            if (quantity < 1) {
                // Remove item if quantity becomes invalid
                return removeFromCart(productId)
            }
            
            val request = UpdateCartQuantityRequest(quantity = quantity)
            val response = cartApi.setCartQuantity(productId, request)
            
            if (response.isSuccessful) {
                // Refresh cart after updating to get updated cart state
                val refreshResult = refreshCart()
                if (refreshResult.isSuccess) {
                    Result.success(Unit)
                } else {
                    Log.w(TAG, "Cart refresh failed after update: ${refreshResult.exceptionOrNull()?.message}")
                    Result.success(Unit)
                }
            } else {
                val errorMsg = "Failed to update quantity: ${response.code()}"
                Log.e(TAG, errorMsg)
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Update quantity failed: ${e.message}", e)
            Result.failure(e)
        } finally {
            _isLoading.value = false
        }
    }

    /**
     * Removes a cart item by product ID.
     * 
     * @param productId Product ID to remove from cart
     */
    suspend fun removeFromCart(productId: String): Result<Unit> {
        if (!userSession.isLoggedIn()) {
            return Result.failure(Exception("User not logged in"))
        }
        if (!NetworkObserver.isCurrentlyConnected()) {
            return Result.failure(Exception("No network connection"))
        }

        return try {
            _isLoading.value = true
            val response = cartApi.removeFromCart(productId)
            
            if (response.isSuccessful) {
                // Refresh cart after removing to get updated cart state
                val refreshResult = refreshCart()
                if (refreshResult.isSuccess) {
                    Result.success(Unit)
                } else {
                    Log.w(TAG, "Cart refresh failed after remove: ${refreshResult.exceptionOrNull()?.message}")
                    Result.success(Unit)
                }
            } else {
                val errorMsg = "Failed to remove from cart: ${response.code()}"
                Log.e(TAG, errorMsg)
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Remove from cart failed: ${e.message}", e)
            Result.failure(e)
        } finally {
            _isLoading.value = false
        }
    }

    /**
     * Clears all items from cart locally.
     * Note: Server cart is cleared automatically when order is created.
     * This method is called after successful order creation.
     */
    suspend fun clearCart() {
        _cartItems.value = emptyList()
    }

    /**
     * Fetches cart from API and updates local state.
     * This is the primary method to sync cart data.
     */
    suspend fun refreshCart(): Result<Unit> {
        if (!userSession.isLoggedIn()) {
            _cartItems.value = emptyList()
            return Result.failure(Exception("User not logged in"))
        }
        if (!NetworkObserver.isCurrentlyConnected()) {
            return Result.failure(Exception("No network connection"))
        }

        return try {
            val response = cartApi.getCart()
            
            if (response.isSuccessful) {
                val items = response.body()?.cart ?: emptyList()
                _cartItems.value = items
                Log.d(TAG, "Cart refreshed: ${items.size} items")
                Result.success(Unit)
            } else {
                val errorMsg = "Failed to fetch cart: ${response.code()}"
                Log.e(TAG, errorMsg)
                _error.value = errorMsg
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Cart refresh failed: ${e.message}", e)
            _error.value = e.message
            Result.failure(e)
        }
    }

    /**
     * Alias for refreshCart() for backward compatibility.
     */
    suspend fun syncCart(): Result<Unit> = refreshCart()

    companion object {
        private const val TAG = "CartRepository"
    }
}
