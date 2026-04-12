package com.tgdd.app.data.remote

import com.tgdd.app.data.model.AddToCartRequest
import com.tgdd.app.data.model.AddToCartResponse
import com.tgdd.app.data.model.CartResponse
import com.tgdd.app.data.model.MessageResponse
import com.tgdd.app.data.model.UpdateCartQuantityRequest
import retrofit2.Response
import retrofit2.http.*

/**
 * Retrofit API interface for shopping cart operations.
 * Defines endpoints for cart management including adding, updating, and removing items.
 *
 * Base URL: https://api-worker.dangduytoan13l.workers.dev/api/
 * Requires: Bearer token authentication header
 */
interface CartApi {
    /**
     * Fetches the current user's shopping cart.
     * @return Response containing cart items and totals
     * @see CartResponse
     */
    @GET("cart")
    suspend fun getCart(): Response<CartResponse>
    
    /**
     * Adds a product to the shopping cart.
     * @param request Request body containing product ID and quantity
     * @return Response confirming addition and updated cart
     * @see AddToCartResponse
     */
    @POST("cart")
    suspend fun addToCart(@Body request: AddToCartRequest): Response<AddToCartResponse>

    /**
     * Updates the quantity of a product in the cart.
     * @param productId The ID of the product to update
     * @param request Request body containing new quantity
     * @return Response with success message
     * @see MessageResponse
     */
    @PATCH("cart/{productId}")
    suspend fun setCartQuantity(
        @Path("productId") productId: String,
        @Body request: UpdateCartQuantityRequest
    ): Response<MessageResponse>
    
    /**
     * Removes a product from the shopping cart.
     * @param productId The ID of the product to remove
     * @return Response with success message
     * @see MessageResponse
     */
    @DELETE("cart/{productId}")
    suspend fun removeFromCart(@Path("productId") productId: String): Response<MessageResponse>
}