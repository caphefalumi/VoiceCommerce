package com.tgdd.app.data.remote

import com.tgdd.app.data.model.ProductDto
import com.tgdd.app.data.model.ProductListResponse
import com.tgdd.app.data.model.ProductResponse
import retrofit2.Response
import retrofit2.http.*

/**
 * Retrofit API interface for product operations.
 * Defines endpoints for product fetching, searching, and filtering.
 *
 * Base URL: https://api-worker.dangduytoan13l.workers.dev/api/
 * Requires: Bearer token authentication header
 */
interface ProductApi {
    /**
     * Fetches all products from the API.
     * @return Response containing list of all products
     * @see ProductListResponse
     * @see ProductDto
     */
    @GET("products")
    suspend fun getProducts(): Response<ProductListResponse>
    
    /**
     * Fetches a single product by its unique identifier.
     * @param id The unique product ID
     * @return Response containing the product details
     * @see ProductResponse
     * @see ProductDto
     */
    @GET("products/{id}")
    suspend fun getProductById(@Path("id") id: String): Response<ProductResponse>
    
    /**
     * Searches products by query string.
     * @param query Search term for product name or description
     * @return Response containing list of matching products
     * @see ProductListResponse
     * @see ProductDto
     */
    @GET("products")
    suspend fun searchProducts(@Query("search") query: String): Response<ProductListResponse>
    
    /**
     * Fetches products filtered by category.
     * @param category Category name to filter by
     * @return Response containing list of products in the specified category
     * @see ProductListResponse
     * @see ProductDto
     */
    @GET("products")
    suspend fun getProductsByCategory(@Query("category") category: String): Response<ProductListResponse>
}