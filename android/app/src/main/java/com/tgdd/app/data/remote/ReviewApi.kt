package com.tgdd.app.data.remote

import com.tgdd.app.data.model.ApiResponses
import com.tgdd.app.data.model.ReviewDto
import retrofit2.Response
import retrofit2.http.*

interface ReviewApi {
    @GET("reviews/{productId}")
    suspend fun getReviewsByProductId(@Path("productId") productId: String): Response<ApiResponses.ReviewsResponse>

    @POST("reviews")
    suspend fun createReview(@Body review: Map<String, Any>): Response<ApiResponses.ReviewResponse>

    @PUT("reviews/{reviewId}")
    suspend fun updateReview(
        @Path("reviewId") reviewId: String,
        @Body review: Map<String, Any>
    ): Response<ApiResponses.ReviewResponse>

    @DELETE("reviews/{reviewId}")
    suspend fun deleteReview(@Path("reviewId") reviewId: String): Response<ApiResponses.MessageResponse>

    @POST("reviews/{reviewId}/helpful")
    suspend fun markHelpful(@Path("reviewId") reviewId: String): Response<ApiResponses.MessageResponse>
}
