@file:JvmName("DatabaseModuleProvider")

package com.tgdd.app.di

import android.content.Context
import androidx.room.Room
import com.tgdd.app.data.local.AppDatabase
import com.tgdd.app.data.local.dao.CartDao
import com.tgdd.app.data.local.dao.OrderDao
import com.tgdd.app.data.local.dao.ProductDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Hilt module providing Room database and DAO dependencies for local data persistence.
 *
 * ## Provides
 * - [AppDatabase] - The main Room database instance (`tgdd_database`)
 * - [ProductDao] - Data access for product caching
 * - [CartDao] - Data access for cart items
 * - [OrderDao] - Data access for order history
 * - [WishlistDao] - Data access for wishlist items
 * - [ReviewDao] - Data access for cached reviews
 * - [AddressDao] - Data access for saved addresses
 * - [PromoCodeDao] - Data access for cached promo codes
 * - [SearchHistoryDao] - Data access for search history
 *
 * ## Scope
 * All dependencies are scoped to [SingletonComponent]. The database is created once
 * and shared across all repositories and ViewModels.
 *
 * ## Dependencies
 * - Requires [ApplicationContext] for Room database initialization
 * - All DAOs depend on the [AppDatabase] instance
 *
 * ## Room Database Setup
 * The [AppDatabase] is configured with:
 * - **Database name**: `tgdd_database`
 * - **Fallback strategy**: [Room.databaseBuilder] with `fallbackToDestructiveMigration()`
 *   - Automatically drops and recreates tables when schema changes (data loss on upgrade)
 *   - Suitable for development; consider switching to migrations in production
 *
 * @see DatabaseModule For database configuration details
 * @see com.tgdd.app.data.local For entity and DAO definitions
 */
@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    /**
     * Provides the main [AppDatabase] instance for Room database operations.
     *
     * ## Room Database Setup
     * - **Database builder**: Uses [Room.databaseBuilder] with application context
     * - **Database class**: [AppDatabase] - contains all DAOs and type converters
     * - **Database name**: `tgdd_database` - stored in app's internal storage
     *
     * ## Migration Strategy
     * - **Fallback to destructive migration**: Enabled via `fallbackToDestructiveMigration()`
     * - **Behavior**: When schema version mismatch occurs, database is dropped and recreated
     * - **Implication**: All local data is lost during schema upgrades
     *
     * ## Lifecycle Considerations
     * - Database is initialized lazily on first access
     * - Singleton scope ensures only one database instance exists
     * - Closing the database should happen in Application.onTerminate() if needed
     *
     * @param context Application context (not Activity context to prevent memory leaks)
     * @return Configured Room database instance
     */
    @Provides
    @Singleton
    fun provideAppDatabase(@ApplicationContext context: Context): AppDatabase {
        return Room.databaseBuilder(
            context,
            AppDatabase::class.java,
            "tgdd_database"
        ).fallbackToDestructiveMigration()
            .build()
    }

    /**
     * Provides [ProductDao] for product-related local database operations.
     *
     * ## Purpose
     * Enables caching of product data for offline access and faster loading.
     * Used by [com.tgdd.app.data.repository.ProductRepository] for data synchronization.
     *
     * @param database Room database instance containing this DAO
     * @return ProductDao implementation
     */
    @Provides
    @Singleton
    fun provideProductDao(database: AppDatabase): ProductDao {
        return database.productDao()
    }

    /**
     * Provides [CartDao] for cart item local database operations.
     *
     * ## Purpose
     * Manages local cart persistence. Cart items are stored locally to:
     * - Preserve cart across app restarts
     * - Enable offline cart viewing
     * - Sync with server when online
     *
     * @param database Room database instance containing this DAO
     * @return CartDao implementation
     */
    @Provides
    @Singleton
    fun provideCartDao(database: AppDatabase): CartDao {
        return database.cartDao()
    }

    /**
     * Provides [OrderDao] for order history local database operations.
     *
     * ## Purpose
     * Stores order history locally for:
     * - Quick access to past orders
     * - Offline order viewing
     * - Order status tracking offline cache
     *
     * @param database Room database instance containing this DAO
     * @return OrderDao implementation
     */
    @Provides
    @Singleton
    fun provideOrderDao(database: AppDatabase): OrderDao {
        return database.orderDao()
    }

    /**
     * Provides WishlistDao for wishlist local database operations.
     *
     * ## Purpose
     * Persists user's wishlist locally to:
     * - Quick wishlist access without network
     * - Preserve wishlist across sessions
     * - Sync with server on connectivity
     *
     * @param database Room database instance containing this DAO
     * @return WishlistDao implementation
     */
    @Provides
    @Singleton
    fun provideWishlistDao(database: AppDatabase): com.tgdd.app.data.local.dao.WishlistDao {
        return database.wishlistDao()
    }

    /**
     * Provides ReviewDao for product review local database operations.
     *
     * ## Purpose
     * Caches product reviews locally to:
     * - Display reviews without network
     * - Reduce API calls for frequently viewed products
     * - Store user's own reviews for quick access
     *
     * @param database Room database instance containing this DAO
     * @return ReviewDao implementation
     */
    @Provides
    @Singleton
    fun provideReviewDao(database: AppDatabase): com.tgdd.app.data.local.dao.ReviewDao {
        return database.reviewDao()
    }

    /**
     * Provides AddressDao for shipping/billing address local storage.
     *
     * ## Purpose
     * Stores user addresses locally to:
     * - Quick address selection at checkout
     * - Work offline without re-fetching
     * - Reduce API calls for address data
     *
     * @param database Room database instance containing this DAO
     * @return AddressDao implementation
     */
    @Provides
    @Singleton
    fun provideAddressDao(database: AppDatabase): com.tgdd.app.data.local.dao.AddressDao {
        return database.addressDao()
    }

    /**
     * Provides PromoCodeDao for promo code caching.
     *
     * ## Purpose
     * Caches validated promo codes locally to:
     * - Apply codes without network
     * - Store expiry information for validation
     * - Reduce repeated validation API calls
     *
     * @param database Room database instance containing this DAO
     * @return PromoCodeDao implementation
     */
    @Provides
    @Singleton
    fun providePromoCodeDao(database: AppDatabase): com.tgdd.app.data.local.dao.PromoCodeDao {
        return database.promoCodeDao()
    }

    /**
     * Provides SearchHistoryDao for search history persistence.
     *
     * ## Purpose
     * Stores recent searches locally to:
     * - Show search suggestions
     * - Quick re-search functionality
     * - Analytics on search patterns
     *
     * @param database Room database instance containing this DAO
     * @return SearchHistoryDao implementation
     */
    @Provides
    @Singleton
    fun provideSearchHistoryDao(database: AppDatabase): com.tgdd.app.data.local.dao.SearchHistoryDao {
        return database.searchHistoryDao()
    }
}
