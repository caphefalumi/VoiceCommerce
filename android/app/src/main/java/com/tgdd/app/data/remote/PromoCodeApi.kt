package com.tgdd.app.data.remote

import com.tgdd.app.data.model.ApiResponses
import retrofit2.Response
import retrofit2.http.*

/**
 * Retrofit API interface for promo code and coupon operations.
 * Defines endpoints for fetching, validating, and applying promo codes.
 *
 * Base URL: https://api-worker.dangduytoan13l.workers.dev/api/
 * Requires: Bearer token authentication header
 */
interface PromoCodeApi {
    /**
     * Fetches all active promo codes.
     * @return Response containing list of active promo codes
     * @see ApiResponses.PromoCodesResponse
     */
    @GET("promo-codes")
    suspend fun getActivePromoCodes(): Response<ApiResponses.PromoCodesResponse>

    /**
     * Validates a promo code without applying it.
     * @param data Map containing promo code (code)
     * @return Response with validation result and discount info
     * @see ApiResponses.PromoCodeValidationResponse
     */
    @POST("promo-codes/validate")
    suspend fun validatePromoCode(@Body data: Map<String, Any>): Response<ApiResponses.PromoCodeValidationResponse>

    /**
     * Applies a promo code to the cart.
     * @param data Map containing promo code and cart details (code, cartId)
     * @return Response with applied discount
     * @see ApiResponses.PromoCodeApplicationResponse
     */
    @POST("promo-codes/apply")
    suspend fun applyPromoCode(@Body data: Map<String, Any>): Response<ApiResponses.PromoCodeApplicationResponse>

    /**
     * Applies a coupon to the order.
     * @param data Map containing coupon code (code)
     * @return Response with applied coupon
     * @see ApiResponses.CouponApplyResponse
     */
    @POST("coupons/apply")
    suspend fun applyCoupon(@Body data: Map<String, Any>): Response<ApiResponses.CouponApplyResponse>
}