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
     * @param request Request containing promo code and order total
     * @return Response with validation result and discount info
     * @see ApiResponses.PromoCodeValidationResponse
     */
    @POST("promo-codes/validate")
    suspend fun validatePromoCode(@Body request: ApiResponses.PromoCodeValidationRequest): Response<ApiResponses.PromoCodeValidationResponse>

    /**
     * Applies a promo code to the cart.
     * @param request Request containing promo code and order total
     * @return Response with applied discount
     * @see ApiResponses.PromoCodeApplicationResponse
     */
    @POST("promo-codes/apply")
    suspend fun applyPromoCode(@Body request: ApiResponses.PromoCodeApplicationRequest): Response<ApiResponses.PromoCodeApplicationResponse>

    /**
     * Applies a coupon to the order.
     * @param request Request containing coupon code, order total, and optional user ID
     * @return Response with applied coupon
     * @see ApiResponses.CouponApplyResponse
     */
    @POST("coupons/apply")
    suspend fun applyCoupon(@Body request: ApiResponses.CouponApplyRequest): Response<ApiResponses.CouponApplyResponse>
}