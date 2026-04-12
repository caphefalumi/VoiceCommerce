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

/**
 * Retrofit API interface for order and payment operations.
 * Defines endpoints for order management, checkout, and payment processing.
 *
 * Base URL: https://api-worker.dangduytoan13l.workers.dev/api/
 * Requires: Bearer token authentication header
 */
interface OrderApi {
    /**
     * Fetches all orders for a specific user.
     * @param userId The unique user identifier
     * @return Response containing list of user's orders
     * @see OrderListResponse
     * @see OrderDto
     */
    @GET("orders/{userId}")
    suspend fun getOrders(@Path("userId") userId: String): Response<OrderListResponse>
    
    /**
     * Fetches a single order by its ID.
     * @param id The unique order identifier
     * @return Response containing order details
     * @see OrderResponse
     * @see OrderDto
     */
    @GET("orders/status/{orderId}")
    suspend fun getOrderById(@Path("orderId") id: String): Response<OrderResponse>
    
    /**
     * Creates a new order.
     * @param order Map containing order details (items, shipping address, payment method)
     * @return Response with created order confirmation
     * @see OrderCreateResponse
     */
    @POST("orders")
    suspend fun createOrder(@Body order: Map<String, Any>): Response<OrderCreateResponse>
    
    /**
     * Updates the status of an existing order.
     * @param id The order ID to update
     * @param status Map containing new status (status)
     * @return Response with success message
     * @see MessageResponse
     */
    @PATCH("orders/{orderId}/status")
    suspend fun updateOrderStatus(@Path("orderId") id: String, @Body status: Map<String, String>): Response<MessageResponse>
    
    /**
     * Creates a Stripe checkout session for payment.
     * @param request Map containing checkout details (items, promoCode, redirectUri)
     * @return Response with Stripe session ID and URL
     * @see CheckoutSessionResponse
     */
    @POST("create-checkout-session")
    suspend fun createCheckoutSession(@Body request: Map<String, Any>): Response<CheckoutSessionResponse>
    
    /**
     * Checks the payment status of a checkout session.
     * @param sessionId The Stripe session ID
     * @return Response with payment status (paid, pending, failed)
     * @see PaymentStatusResponse
     */
    @GET("payment-status/{sessionId}")
    suspend fun getPaymentStatus(@Path("sessionId") sessionId: String): Response<PaymentStatusResponse>
}