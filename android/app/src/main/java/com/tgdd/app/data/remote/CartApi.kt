package com.tgdd.app.data.remote

import com.tgdd.app.data.model.AddToCartResponse
import com.tgdd.app.data.model.CartResponse
import com.tgdd.app.data.model.MessageResponse
import retrofit2.Response
import retrofit2.http.*

interface CartApi {
    @GET("cart")
    suspend fun getCart(): Response<CartResponse>
    
    @POST("cart")
    suspend fun addToCart(@Body item: Map<String, Any>): Response<AddToCartResponse>
    
    @DELETE("cart/{productId}")
    suspend fun removeFromCart(@Path("productId") productId: String): Response<MessageResponse>
}
