package com.tgdd.app.data.remote

import com.tgdd.app.data.model.ProductDto
import com.tgdd.app.data.model.ProductListResponse
import com.tgdd.app.data.model.ProductResponse
import retrofit2.Response
import retrofit2.http.*

interface ProductApi {
    @GET("products")
    suspend fun getProducts(): Response<ProductListResponse>
    
    @GET("products/{id}")
    suspend fun getProductById(@Path("id") id: String): Response<ProductResponse>
    
    @GET("products")
    suspend fun searchProducts(@Query("search") query: String): Response<ProductListResponse>
    
    @GET("products")
    suspend fun getProductsByCategory(@Query("category") category: String): Response<ProductListResponse>
}
