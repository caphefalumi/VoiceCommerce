package com.tgdd.app.data.remote

import com.tgdd.app.data.model.AddToCartResponse
import com.tgdd.app.data.model.MessageResponse
import com.tgdd.app.data.model.OrderCreateResponse
import com.tgdd.app.data.model.OrderDto
import com.tgdd.app.data.model.OrderListResponse
import com.tgdd.app.data.model.OrderResponse
import retrofit2.Response
import retrofit2.http.*

interface OrderApi {
    @GET("orders/{userId}")
    suspend fun getOrders(@Path("userId") userId: String): Response<OrderListResponse>
    
    @GET("orders/status/{orderId}")
    suspend fun getOrderById(@Path("orderId") id: String): Response<OrderResponse>
    
    @POST("orders")
    suspend fun createOrder(@Body order: Map<String, Any>): Response<OrderCreateResponse>
    
    @PATCH("orders/{orderId}/status")
    suspend fun updateOrderStatus(@Path("orderId") id: String, @Body status: Map<String, String>): Response<MessageResponse>
}
