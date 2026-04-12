package com.tgdd.app.data.remote

import com.tgdd.app.data.model.ApiResponses
import retrofit2.Response
import retrofit2.http.*

/**
 * Retrofit API interface for wishlist operations.
 * Defines endpoints for managing user's product wishlist.
 *
 * Base URL: https://api-worker.dangduytoan13l.workers.dev/api/
 * Requires: Bearer token authentication header
 */
interface WishlistApi {
    /**
     * Fetches the current user's wishlist.
     * @return Response containing list of wishlist items
     * @see ApiResponses.WishlistResponse
     */
    @GET("wishlist")
    suspend fun getWishlist(): Response<ApiResponses.WishlistResponse>

    /**
     * Adds a product to the wishlist.
     * @param data Map containing product ID (productId)
     * @return Response with success message
     * @see ApiResponses.MessageResponse
     */
    @POST("wishlist")
    suspend fun addToWishlist(@Body data: Map<String, String>): Response<ApiResponses.MessageResponse>

    /**
     * Removes a product from the wishlist.
     * @param productId The product ID to remove
     * @return Response with success message
     * @see ApiResponses.MessageResponse
     */
    @DELETE("wishlist/{productId}")
    suspend fun removeFromWishlist(@Path("productId") productId: String): Response<ApiResponses.MessageResponse>
}