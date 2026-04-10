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

@Module
@InstallIn(SingletonComponent::class)
object RepositoryModule {

    @Provides
    @Singleton
    fun provideUserSession(@ApplicationContext context: Context): UserSession {
        return UserSession(context)
    }

    @Provides
    @Singleton
    fun provideProductRepository(productDao: ProductDao, productApi: ProductApi): ProductRepository {
        return ProductRepository(productDao, productApi)
    }

    @Provides
    @Singleton
    fun provideCartRepository(cartDao: CartDao, cartApi: CartApi): CartRepository {
        return CartRepository(cartDao, cartApi)
    }

    @Provides
    @Singleton
    fun provideUserRepository(userApi: UserApi, userSession: UserSession): UserRepository {
        return UserRepository(userApi, userSession)
    }

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

    @Provides
    @Singleton
    fun provideWishlistRepository(
        wishlistDao: com.tgdd.app.data.local.dao.WishlistDao,
        wishlistApi: com.tgdd.app.data.remote.WishlistApi
    ): com.tgdd.app.data.repository.WishlistRepository {
        return com.tgdd.app.data.repository.WishlistRepository(wishlistDao, wishlistApi)
    }

    @Provides
    @Singleton
    fun provideReviewRepository(
        reviewDao: com.tgdd.app.data.local.dao.ReviewDao,
        reviewApi: com.tgdd.app.data.remote.ReviewApi
    ): com.tgdd.app.data.repository.ReviewRepository {
        return com.tgdd.app.data.repository.ReviewRepository(reviewDao, reviewApi)
    }

    @Provides
    @Singleton
    fun providePromoCodeRepository(
        promoCodeDao: com.tgdd.app.data.local.dao.PromoCodeDao,
        promoCodeApi: com.tgdd.app.data.remote.PromoCodeApi
    ): com.tgdd.app.data.repository.PromoCodeRepository {
        return com.tgdd.app.data.repository.PromoCodeRepository(promoCodeDao, promoCodeApi)
    }

    @Provides
    @Singleton
    fun provideAddressRepository(
        addressDao: com.tgdd.app.data.local.dao.AddressDao
    ): com.tgdd.app.data.repository.AddressRepository {
        return com.tgdd.app.data.repository.AddressRepository(addressDao)
    }

    @Provides
    @Singleton
    fun provideSearchHistoryRepository(
        searchHistoryDao: com.tgdd.app.data.local.dao.SearchHistoryDao
    ): com.tgdd.app.data.repository.SearchHistoryRepository {
        return com.tgdd.app.data.repository.SearchHistoryRepository(searchHistoryDao)
    }
}
