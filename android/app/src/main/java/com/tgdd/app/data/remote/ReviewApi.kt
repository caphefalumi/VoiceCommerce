package com.tgdd.app.data.remote

import com.tgdd.app.data.model.ApiResponses
import com.tgdd.app.data.model.ReviewDto
import retrofit2.Response
import retrofit2.http.*

/**
 * Retrofit API interface for product review operations.
 * Defines endpoints for fetching, creating, updating, and managing reviews.
 *
 * Base URL: https://api-worker.dangduytoan13l.workers.dev/api/
 * Requires: Bearer token authentication header
 */
interface ReviewApi {
    /**
     * Fetches all reviews for a specific product.
     * @param productId The product ID to get reviews for
     * @return Response containing list of reviews
     * @see ApiResponses.ReviewsResponse
     * @see ReviewDto
     */
    @GET("products/{productId}/reviews")
    suspend fun getReviewsByProductId(@Path("productId") productId: String): Response<ApiResponses.ReviewsResponse>

    /**
     * Creates a new review for a product.
     * @param productId The product being reviewed
     * @param review Map containing review details (rating, comment)
     * @return Response with created review
     * @see ApiResponses.ReviewResponse
     */
    @POST("products/{productId}/reviews")
    suspend fun createReview(
        @Path("productId") productId: String,
        @Body review: Map<String, Any>
    ): Response<ApiResponses.ReviewResponse>

    /**
     * Updates an existing review.
     * @param reviewId The review ID to update
     * @param review Map containing updated review details (rating, comment)
     * @return Response with updated review
     * @see ApiResponses.ReviewResponse
     */
    @PUT("reviews/{reviewId}")
    suspend fun updateReview(
        @Path("reviewId") reviewId: String,
        @Body review: Map<String, Any>
    ): Response<ApiResponses.ReviewResponse>

    /**
     * Deletes a review.
     * @param reviewId The review ID to delete
     * @return Response with success message
     * @see ApiResponses.MessageResponse
     */
    @DELETE("reviews/{reviewId}")
    suspend fun deleteReview(@Path("reviewId") reviewId: String): Response<ApiResponses.MessageResponse>

    /**
     * Marks a review as helpful.
     * @param reviewId The review ID to mark as helpful
     * @return Response with success message
     * @see ApiResponses.MessageResponse
     */
    @POST("reviews/{reviewId}/helpful")
    suspend fun markHelpful(@Path("reviewId") reviewId: String): Response<ApiResponses.MessageResponse>
}