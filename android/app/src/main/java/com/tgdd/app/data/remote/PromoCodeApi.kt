package com.tgdd.app.data.remote

import com.tgdd.app.data.model.ApiResponses
import retrofit2.Response
import retrofit2.http.*

interface PromoCodeApi {
    @GET("promo-codes")
    suspend fun getActivePromoCodes(): Response<ApiResponses.PromoCodesResponse>

    @POST("promo-codes/validate")
    suspend fun validatePromoCode(@Body data: Map<String, Any>): Response<ApiResponses.PromoCodeValidationResponse>

    @POST("promo-codes/apply")
    suspend fun applyPromoCode(@Body data: Map<String, Any>): Response<ApiResponses.PromoCodeApplicationResponse>

    @POST("coupons/apply")
    suspend fun applyCoupon(@Body data: Map<String, Any>): Response<ApiResponses.CouponApplyResponse>
}
