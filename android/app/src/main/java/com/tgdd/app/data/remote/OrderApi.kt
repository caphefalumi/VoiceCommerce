package com.tgdd.app.data.remote

import com.tgdd.app.data.model.AddToCartResponse
import com.tgdd.app.data.model.CheckoutSessionResponse
import com.tgdd.app.data.model.MessageResponse
import com.tgdd.app.data.model.OrderCreateResponse
import com.tgdd.app.data.model.OrderDto
import com.tgdd.app.data.model.OrderListResponse
import com.tgdd.app.data.model.OrderResponse
import com.tgdd.app.data.model.PaymentStatusResponse
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
    
    @POST("create-checkout-session")
    suspend fun createCheckoutSession(@Body request: Map<String, Any>): Response<CheckoutSessionResponse>
    
    @GET("payment-status/{sessionId}")
    suspend fun getPaymentStatus(@Path("sessionId") sessionId: String): Response<PaymentStatusResponse>
}
