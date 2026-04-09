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

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

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

    @Provides
    @Singleton
    fun provideProductDao(database: AppDatabase): ProductDao {
        return database.productDao()
    }

    @Provides
    @Singleton
    fun provideCartDao(database: AppDatabase): CartDao {
        return database.cartDao()
    }

    @Provides
    @Singleton
    fun provideOrderDao(database: AppDatabase): OrderDao {
        return database.orderDao()
    }
}

    @Provides
    @Singleton
    fun provideWishlistDao(database: AppDatabase): com.tgdd.app.data.local.dao.WishlistDao {
        return database.wishlistDao()
    }

    @Provides
    @Singleton
    fun provideReviewDao(database: AppDatabase): com.tgdd.app.data.local.dao.ReviewDao {
        return database.reviewDao()
    }

    @Provides
    @Singleton
    fun provideAddressDao(database: AppDatabase): com.tgdd.app.data.local.dao.AddressDao {
        return database.addressDao()
    }

    @Provides
    @Singleton
    fun providePromoCodeDao(database: AppDatabase): com.tgdd.app.data.local.dao.PromoCodeDao {
        return database.promoCodeDao()
    }

    @Provides
    @Singleton
    fun provideSearchHistoryDao(database: AppDatabase): com.tgdd.app.data.local.dao.SearchHistoryDao {
        return database.searchHistoryDao()
    }
