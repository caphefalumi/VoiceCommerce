package com.tgdd.app.data.remote

import com.tgdd.app.data.model.ApiResponses
import retrofit2.Response
import retrofit2.http.*

interface WishlistApi {
    @GET("wishlist")
    suspend fun getWishlist(): Response<ApiResponses.WishlistResponse>

    @POST("wishlist")
    suspend fun addToWishlist(@Body data: Map<String, String>): Response<ApiResponses.MessageResponse>

    @DELETE("wishlist/{productId}")
    suspend fun removeFromWishlist(@Path("productId") productId: String): Response<ApiResponses.MessageResponse>
}
