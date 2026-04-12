@file:JvmName("NetworkModuleProvider")

package com.tgdd.app.di

import android.content.Context
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.tgdd.app.data.local.UserSession
import com.tgdd.app.data.remote.CartApi
import com.tgdd.app.data.remote.OrderApi
import com.tgdd.app.data.remote.ProductApi
import com.tgdd.app.data.remote.TicketApi
import com.tgdd.app.data.remote.AiVoiceApi
import com.tgdd.app.data.remote.UserApi
import com.tgdd.app.data.remote.VoiceApi
import com.tgdd.app.data.network.AuthInterceptor
import com.tgdd.app.data.network.RetryInterceptor
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Named
import javax.inject.Singleton

/**
 * Hilt module providing network-related dependencies for the application.
 *
 * ## Provides
 * - [Gson] instance configured for lenient JSON parsing
 * - [HttpLoggingInterceptor] for HTTP request/response logging (debug builds)
 * - [OkHttpClient] with interceptors for auth, retry logic, and token injection
 * - [Retrofit] instances for API communication (primary API & AI Worker)
 * - Typed API interfaces: [ProductApi], [CartApi], [OrderApi], [UserApi], etc.
 *
 * ## Scope
 * All dependencies are scoped to [SingletonComponent], meaning a single instance
 * is created and shared across the entire application lifecycle.
 *
 * ## Dependencies
 * - Requires [ApplicationContext] for [AuthInterceptor] and [OkHttpClient]
 * - Depends on [UserSession] for token retrieval in the auth interceptor
 *
 * ## Network Architecture
 * The app communicates with two backend workers:
 * 1. **API Worker** (`api-worker`) - Handles all standard e-commerce operations
 * 2. **AI Worker** (`ai-worker`) - Handles AI voice and chatbot functionality
 *
 * Each worker has its own [Retrofit] instance (distinguished by @Named qualifier)
 * to allow independent configuration and base URLs.
 *
 * @see NetworkModule For full network configuration details
 * @see com.tgdd.app.data.remote For API interface definitions
 */
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    // Base URLs (configured in build.gradle.kts or CI/CD):
    // - API Worker: https://api-worker.dangduytoan13l.workers.dev/api/
    // - AI Worker: https://ai-worker.dangduytoan13l.workers.dev/

    /**
     * Provides a configured [Gson] instance for JSON serialization/deserialization.
     *
     * ## Configuration Details
     * - **Lenient mode enabled**: Allows parsing of malformed JSON (handles trailing commas, etc.)
     * - **No field naming policy**: The API returns camelCase JSON and all DTO fields
     *   use explicit @SerializedName annotations. Setting a naming policy would override
     *   those annotations and break deserialization.
     *
     * ## Why This Configuration
     * The lenient setting provides resilience against minor API response inconsistencies,
     * while explicit @SerializedName annotations ensure field mapping is always correct
     * regardless of server response casing.
     *
     * @return A Gson instance configured for the application's API responses
     */
    @Provides
    @Singleton
    fun provideGson(): Gson {
        return GsonBuilder()
            // Do NOT set a field naming policy — the API returns camelCase and all
            // DTO fields use explicit @SerializedName annotations. A naming policy
            // would override those annotations and break deserialization.
            .setLenient()
            .create()
    }

    /**
     * Provides an HTTP logging interceptor for debugging network requests.
     *
     * ## Configuration Details
     * - **Log level**: [HttpLoggingInterceptor.Level.BODY] - Logs full request/response bodies
     *
     * ## Usage Considerations
     * This interceptor logs all HTTP traffic, which is useful during development but
     * should be restricted or disabled in production to avoid:
     * - Performance overhead from logging large payloads
     * - Sensitive data exposure in logs
     *
     * Consider using BuildConfig to conditionally set log level based on debug/release.
     *
     * @return HttpLoggingInterceptor configured for body-level logging
     */
    @Provides
    @Singleton
    fun provideLoggingInterceptor(): HttpLoggingInterceptor {
        return HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }
    }

    /**
     * Provides a configured [OkHttpClient] with all necessary interceptors.
     *
     * ## Configuration Details
     * ### Timeouts
     * - **Connect timeout**: 30 seconds
     * - **Read timeout**: 30 seconds
     * - **Write timeout**: 30 seconds
     *
     * ### Interceptors (in order of execution)
     * 1. **HttpLoggingInterceptor**: Logs request/response bodies for debugging
     * 2. **AuthInterceptor**: Handles authentication token injection
     * 3. **RetryInterceptor**: Automatically retries failed requests (max 3 attempts with exponential backoff)
     * 4. **Token Injection Interceptor**: Adds Authorization header with Bearer token
     *
     * ## Lifecycle Considerations
     * The OkHttpClient is a singleton, so interceptors must be thread-safe.
     * [UserSession] is accessed for token retrieval on each request.
     *
     * ## Thread Safety
     * All interceptors are designed to be thread-safe since they may be accessed
     * from multiple network threads simultaneously.
     *
     * @param loggingInterceptor HTTP logging interceptor for debugging
     * @param userSession User session for token retrieval
     * @param context Application context for interceptors
     * @return Fully configured OkHttpClient instance
     */
    @Provides
    @Singleton
    fun provideOkHttpClient(
        loggingInterceptor: HttpLoggingInterceptor,
        userSession: UserSession,
        @ApplicationContext context: Context
    ): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            .addInterceptor(AuthInterceptor(context))
            .addInterceptor(RetryInterceptor(maxRetries = 3))
            .addInterceptor { chain ->
                val token = userSession.getAuthToken()
                val request = chain.request().newBuilder()
                    .addHeader("Content-Type", "application/json")
                    .addHeader("Accept", "application/json")
                    .apply {
                        if (!token.isNullOrBlank()) {
                            addHeader("Authorization", "Bearer $token")
                        }
                    }
                    .build()
                chain.proceed(request)
            }
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    /**
     * Provides a [Retrofit] instance for the main API Worker.
     *
     * ## Retrofit Builder Configuration
     * - **Base URL**: `https://api-worker.dangduytoan13l.workers.dev/api/`
     * - **HTTP Client**: Shared [OkHttpClient] with all interceptors configured
     * - **Converter Factory**: [GsonConverterFactory] with custom Gson instance
     *
     * ## Purpose
     * This Retrofit instance handles all standard e-commerce API calls including:
     * - Product browsing and search
     * - Cart management
     * - Order processing
     * - User authentication and profile
     * - Wishlists and reviews
     *
     * ## Named Qualifier
     * This instance is qualified with `@Named("apiWorkerRetrofit")` to distinguish
     * it from the AI Worker Retrofit instance.
     *
     * @param okHttpClient Shared OkHttpClient with interceptors
     * @param gson Custom Gson instance for JSON handling
     * @return Retrofit instance configured for API Worker
     */
    @Provides
    @Singleton
    @Named("apiWorkerRetrofit")
    fun provideRetrofit(okHttpClient: OkHttpClient, gson: Gson): Retrofit {
        return Retrofit.Builder()
            .baseUrl("https://api-worker.dangduytoan13l.workers.dev/api/")
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
    }

    /**
     * Provides a [Retrofit] instance for the AI Worker.
     *
     * ## Retrofit Builder Configuration
     * - **Base URL**: `https://ai-worker.dangduytoan13l.workers.dev/`
     * - **HTTP Client**: Shared [OkHttpClient] (reuses auth and retry interceptors)
     * - **Converter Factory**: [GsonConverterFactory] with custom Gson instance
     *
     * ## Purpose
     * This Retrofit instance handles AI-related API calls including:
     * - Voice recognition and synthesis
     * - AI chatbot interactions
     * - Voice commerce commands
     *
     * ## Named Qualifier
     * Qualified with `@Named("aiWorkerRetrofit")` to distinguish from API Worker.
     *
     * @param okHttpClient Shared OkHttpClient with interceptors
     * @param gson Custom Gson instance for JSON handling
     * @return Retrofit instance configured for AI Worker
     */
    @Provides
    @Singleton
    @Named("aiWorkerRetrofit")
    fun provideAiWorkerRetrofit(okHttpClient: OkHttpClient, gson: Gson): Retrofit {
        return Retrofit.Builder()
            .baseUrl("https://ai-worker.dangduytoan13l.workers.dev/")
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
    }

    /**
     * Provides the [ProductApi] interface for product-related API operations.
     *
     * ## API Operations
     * - Fetch product listings
     * - Get product details
     * - Search products
     * - Filter and sort products
     *
     * @param retrofit API Worker Retrofit instance
     * @return ProductApi implementation
     */
    @Provides
    @Singleton
    fun provideProductApi(@Named("apiWorkerRetrofit") retrofit: Retrofit): ProductApi {
        return retrofit.create(ProductApi::class.java)
    }

    /**
     * Provides the [CartApi] interface for cart management operations.
     *
     * ## API Operations
     * - Add/remove items from cart
     * - Update item quantities
     * - Get current cart state
     * - Apply promo codes
     *
     * @param retrofit API Worker Retrofit instance
     * @return CartApi implementation
     */
    @Provides
    @Singleton
    fun provideCartApi(@Named("apiWorkerRetrofit") retrofit: Retrofit): CartApi {
        return retrofit.create(CartApi::class.java)
    }

    /**
     * Provides the [OrderApi] interface for order management operations.
     *
     * ## API Operations
     * - Create new orders
     * - Get order history
     * - Track order status
     * - Cancel or modify orders
     *
     * @param retrofit API Worker Retrofit instance
     * @return OrderApi implementation
     */
    @Provides
    @Singleton
    fun provideOrderApi(@Named("apiWorkerRetrofit") retrofit: Retrofit): OrderApi {
        return retrofit.create(OrderApi::class.java)
    }

    /**
     * Provides the [UserApi] interface for user authentication and profile operations.
     *
     * ## API Operations
     * - User login/logout
     * - Registration and email verification
     * - Profile updates
     * - Password management
     * - OAuth authentication
     *
     * @param retrofit API Worker Retrofit instance
     * @return UserApi implementation
     */
    @Provides
    @Singleton
    fun provideUserApi(@Named("apiWorkerRetrofit") retrofit: Retrofit): UserApi {
        return retrofit.create(UserApi::class.java)
    }

    /**
     * Provides the [TicketApi] interface for support ticket operations.
     *
     * ## API Operations
     * - Create support tickets
     * - Get ticket history
     * - Add ticket messages
     * - Close/resolve tickets
     *
     * @param retrofit API Worker Retrofit instance
     * @return TicketApi implementation
     */
    @Provides
    @Singleton
    fun provideTicketApi(@Named("apiWorkerRetrofit") retrofit: Retrofit): TicketApi {
        return retrofit.create(TicketApi::class.java)
    }

    /**
     * Provides the WishlistApi interface for wishlist management.
     *
     * ## API Operations
     * - Add/remove products from wishlist
     * - Get user's wishlist
     * - Move items to cart
     *
     * @param retrofit API Worker Retrofit instance
     * @return WishlistApi implementation
     */
    @Provides
    @Singleton
    fun provideWishlistApi(@Named("apiWorkerRetrofit") retrofit: Retrofit): com.tgdd.app.data.remote.WishlistApi {
        return retrofit.create(com.tgdd.app.data.remote.WishlistApi::class.java)
    }

    /**
     * Provides the ReviewApi interface for product review operations.
     *
     * ## API Operations
     * - Submit product reviews
     * - Get product reviews
     * - Vote on review helpfulness
     * - Report inappropriate reviews
     *
     * @param retrofit API Worker Retrofit instance
     * @return ReviewApi implementation
     */
    @Provides
    @Singleton
    fun provideReviewApi(@Named("apiWorkerRetrofit") retrofit: Retrofit): com.tgdd.app.data.remote.ReviewApi {
        return retrofit.create(com.tgdd.app.data.remote.ReviewApi::class.java)
    }

    /**
     * Provides the PromoCodeApi interface for promo code validation.
     *
     * ## API Operations
     * - Validate promo codes
     * - Get available promo codes
     * - Apply discounts to orders
     *
     * @param retrofit API Worker Retrofit instance
     * @return PromoCodeApi implementation
     */
    @Provides
    @Singleton
    fun providePromoCodeApi(@Named("apiWorkerRetrofit") retrofit: Retrofit): com.tgdd.app.data.remote.PromoCodeApi {
        return retrofit.create(com.tgdd.app.data.remote.PromoCodeApi::class.java)
    }

    /**
     * Provides the [AiVoiceApi] interface for AI voice processing operations.
     *
     * ## API Operations
     * - Voice command processing
     * - Text-to-speech conversion
     * - Voice authentication
     *
     * @param aiWorkerRetrofit AI Worker Retrofit instance
     * @return AiVoiceApi implementation
     */
    @Provides
    @Singleton
    fun provideAiVoiceApi(@Named("aiWorkerRetrofit") aiWorkerRetrofit: Retrofit): AiVoiceApi {
        return aiWorkerRetrofit.create(AiVoiceApi::class.java)
    }

    /**
     * Provides the [VoiceApi] interface for voice-related API operations.
     *
     * ## API Operations
     * - Speech-to-text conversion
     * - Voice command interpretation
     * - Audio stream handling
     *
     * @param aiWorkerRetrofit AI Worker Retrofit instance
     * @return VoiceApi implementation
     */
    @Provides
    @Singleton
    fun provideVoiceApi(@Named("aiWorkerRetrofit") aiWorkerRetrofit: Retrofit): VoiceApi {
        return aiWorkerRetrofit.create(VoiceApi::class.java)
    }
}
