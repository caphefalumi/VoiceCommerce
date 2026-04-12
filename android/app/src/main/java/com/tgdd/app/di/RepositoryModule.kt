package com.tgdd.app.di

import android.content.Context
import com.tgdd.app.data.local.UserSession
import com.tgdd.app.data.local.dao.CartDao
import com.tgdd.app.data.local.dao.OrderDao
import com.tgdd.app.data.local.dao.ProductDao
import com.tgdd.app.data.remote.CartApi
import com.tgdd.app.data.remote.OrderApi
import com.tgdd.app.data.remote.ProductApi
import com.tgdd.app.data.remote.UserApi
import com.tgdd.app.data.repository.CartRepository
import com.tgdd.app.data.repository.OrderRepository
import com.tgdd.app.data.repository.ProductRepository
import com.tgdd.app.data.repository.UserRepository
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Hilt module providing repository dependencies for data access abstraction.
 *
 * ## Provides
 * - [UserSession] - Manages user authentication state and token storage
 * - [ProductRepository] - Product data with local cache and remote sync
 * - [CartRepository] - Cart operations with offline-first strategy
 * - [OrderRepository] - Order management with local persistence
 * - [UserRepository] - User profile and account operations
 * - [WishlistRepository] - Wishlist management
 * - [ReviewRepository] - Product review operations
 * - [PromoCodeRepository] - Promo code validation
 * - [AddressRepository] - Address management
 * - [SearchHistoryRepository] - Search history tracking
 *
 * ## Scope
 * All dependencies are scoped to [SingletonComponent], providing a single
 * repository instance throughout the application lifecycle.
 *
 * ## Dependencies
 * Each repository depends on:
 * - **DAOs** from [DatabaseModule] for local data access
 * - **API interfaces** from [NetworkModule] for remote operations
 * - **[UserSession]** for authentication state
 * - **[ApplicationContext]** for context-dependent operations
 *
 * ## Architecture Pattern
 * Repositories implement the Repository Pattern, providing:
 * - Single source of truth for data operations
 * - Abstraction over local (Room) and remote (Retrofit) data sources
 * - Unified API for ViewModels regardless of data source
 *
 * @see NetworkModule For remote API dependencies
 * @see DatabaseModule For local database dependencies
 * @see com.tgdd.app.data.repository For repository implementations
 */
@Module
@InstallIn(SingletonComponent::class)
object RepositoryModule {

    /**
     * Provides [UserSession] for managing user authentication state.
     *
     * ## Purpose
     * Centralizes authentication data management including:
     * - JWT token storage and retrieval
     * - User session state tracking
     * - Login/logout state management
     *
     * ## Lifecycle Considerations
     * - Persists across app restarts via SharedPreferences
     * - Injected into repositories for auth token access
     * - Interceptors use this for automatic token injection
     *
     * @param context Application context for SharedPreferences
     * @return UserSession instance for auth state management
     */
    @Provides
    @Singleton
    fun provideUserSession(@ApplicationContext context: Context): UserSession {
        return UserSession(context)
    }

    /**
     * Provides [ProductRepository] combining local cache and remote API.
     *
     * ## Dependency Graph
     * - **Local**: [ProductDao] for offline caching
     * - **Remote**: [ProductApi] for network operations
     *
     * ## Data Flow
     * - Reads from local cache first (offline-first)
     * - Syncs with remote on network availability
     * - Updates local cache with remote data
     *
     * @param productDao Local product data access
     * @param productApi Remote product API interface
     * @return ProductRepository instance
     */
    @Provides
    @Singleton
    fun provideProductRepository(productDao: ProductDao, productApi: ProductApi): ProductRepository {
        return ProductRepository(productDao, productApi)
    }

    /**
     * Provides [CartRepository] for shopping cart management.
     *
     * ## Dependency Graph
     * - **Local**: [CartDao] for cart persistence
     * - **Remote**: [CartApi] for sync operations
     * - **Session**: [UserSession] for user identification
     *
     * ## Data Flow
     * - Cart stored locally for offline access
     * - Synced with server when online
     * - Merges local and remote cart on sync
     *
     * @param cartDao Local cart data access
     * @param cartApi Remote cart API interface
     * @param userSession User session for cart ownership
     * @return CartRepository instance
     */
    @Provides
    @Singleton
    fun provideCartRepository(cartDao: CartDao, cartApi: CartApi, userSession: UserSession): CartRepository {
        return CartRepository(cartDao, cartApi, userSession)
    }

    /**
     * Provides [UserRepository] for user profile and account operations.
     *
     * ## Dependency Graph
     * - **Remote**: [UserApi] for authentication and profile APIs
     * - **Session**: [UserSession] for token and session management
     * - **Local**: [CartDao], [WishlistDao], [OrderDao] for data migration
     *
     * ## Purpose
     * Handles:
     * - User authentication (login, register, logout)
     * - Profile management
     * - Account settings
     * - Cart/wishlist migration on login
     *
     * @param userApi Remote user API interface
     * @param userSession User session management
     * @param cartDao Cart DAO for data migration
     * @param wishlistDao Wishlist DAO for data migration
     * @param orderDao Order DAO for order history access
     * @return UserRepository instance
     */
    @Provides
    @Singleton
    fun provideUserRepository(
        userApi: UserApi, 
        userSession: UserSession,
        cartDao: CartDao,
        wishlistDao: com.tgdd.app.data.local.dao.WishlistDao,
        orderDao: OrderDao
    ): UserRepository {
        return UserRepository(userApi, userSession, cartDao, wishlistDao, orderDao)
    }

    /**
     * Provides [OrderRepository] for order management operations.
     *
     * ## Dependency Graph
     * - **Local**: [OrderDao], [CartDao] for persistence
     * - **Remote**: [OrderApi] for order operations
     * - **Context**: [ApplicationContext] for order notifications
     *
     * ## Data Flow
     * - Creates orders from cart data
     * - Persists order history locally
     * - Syncs order status with server
     *
     * @param orderDao Local order data access
     * @param cartDao Cart DAO for order creation
     * @param orderApi Remote order API interface
     * @param context Application context for notifications
     * @return OrderRepository instance
     */
    @Provides
    @Singleton
    fun provideOrderRepository(
        orderDao: OrderDao,
        cartDao: CartDao,
        orderApi: OrderApi,
        @ApplicationContext context: Context
    ): OrderRepository {
        return OrderRepository(orderDao, cartDao, orderApi, context)
    }

    /**
     * Provides WishlistRepository for wishlist management.
     *
     * ## Dependency Graph
     * - **Local**: WishlistDao for persistence
     * - **Remote**: WishlistApi for sync operations
     * - **Session**: [UserSession] for user identification
     *
     * ## Data Flow
     * - Wishlist cached locally
     * - Synced with server on changes
     * - Supports offline wishlist viewing
     *
     * @param wishlistDao Local wishlist data access
     * @param wishlistApi Remote wishlist API interface
     * @param userSession User session for wishlist ownership
     * @return WishlistRepository instance
     */
    @Provides
    @Singleton
    fun provideWishlistRepository(
        wishlistDao: com.tgdd.app.data.local.dao.WishlistDao,
        wishlistApi: com.tgdd.app.data.remote.WishlistApi,
        userSession: UserSession
    ): com.tgdd.app.data.repository.WishlistRepository {
        return com.tgdd.app.data.repository.WishlistRepository(wishlistDao, wishlistApi, userSession)
    }

    /**
     * Provides ReviewRepository for product review operations.
     *
     * ## Dependency Graph
     * - **Local**: ReviewDao for caching
     * - **Remote**: ReviewApi for submission and fetching
     *
     * ## Purpose
     * - Submit product reviews
     * - Fetch and cache product reviews
     * - Display reviews offline from cache
     *
     * @param reviewDao Local review cache
     * @param reviewApi Remote review API
     * @return ReviewRepository instance
     */
    @Provides
    @Singleton
    fun provideReviewRepository(
        reviewDao: com.tgdd.app.data.local.dao.ReviewDao,
        reviewApi: com.tgdd.app.data.remote.ReviewApi
    ): com.tgdd.app.data.repository.ReviewRepository {
        return com.tgdd.app.data.repository.ReviewRepository(reviewDao, reviewApi)
    }

    /**
     * Provides PromoCodeRepository for promo code validation and caching.
     *
     * ## Dependency Graph
     * - **Local**: PromoCodeDao for caching validated codes
     * - **Remote**: PromoCodeApi for validation
     *
     * ## Purpose
     * - Validate promo codes against server
     * - Cache validation results locally
     * - Apply discounts to cart/checkout
     *
     * @param promoCodeDao Local promo code cache
     * @param promoCodeApi Remote validation API
     * @return PromoCodeRepository instance
     */
    @Provides
    @Singleton
    fun providePromoCodeRepository(
        promoCodeDao: com.tgdd.app.data.local.dao.PromoCodeDao,
        promoCodeApi: com.tgdd.app.data.remote.PromoCodeApi
    ): com.tgdd.app.data.repository.PromoCodeRepository {
        return com.tgdd.app.data.repository.PromoCodeRepository(promoCodeDao, promoCodeApi)
    }

    /**
     * Provides AddressRepository for address management.
     *
     * ## Dependency Graph
     * - **Local**: AddressDao for persistence
     *
     * ## Purpose
     * - Manage shipping/billing addresses
     * - Store address defaults
     * - Quick address selection at checkout
     *
     * @param addressDao Local address data access
     * @return AddressRepository instance
     */
    @Provides
    @Singleton
    fun provideAddressRepository(
        addressDao: com.tgdd.app.data.local.dao.AddressDao
    ): com.tgdd.app.data.repository.AddressRepository {
        return com.tgdd.app.data.repository.AddressRepository(addressDao)
    }

    /**
     * Provides SearchHistoryRepository for search history tracking.
     *
     * ## Dependency Graph
     * - **Local**: SearchHistoryDao for persistence
     *
     * ## Purpose
     * - Store recent searches
     * - Provide search suggestions
     * - Clear search history
     *
     * @param searchHistoryDao Local search history access
     * @return SearchHistoryRepository instance
     */
    @Provides
    @Singleton
    fun provideSearchHistoryRepository(
        searchHistoryDao: com.tgdd.app.data.local.dao.SearchHistoryDao
    ): com.tgdd.app.data.repository.SearchHistoryRepository {
        return com.tgdd.app.data.repository.SearchHistoryRepository(searchHistoryDao)
    }
}
