package com.tgdd.app.di

import android.content.Context
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.tgdd.app.data.local.UserSession
import com.tgdd.app.data.remote.CartApi
import com.tgdd.app.data.remote.OrderApi
import com.tgdd.app.data.remote.ProductApi
import com.tgdd.app.data.remote.TicketApi
import com.tgdd.app.data.remote.UserApi
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
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    // Use "https://api-worker.dangduytoan13l.workers.dev/api/" - value comes from build.gradle.kts

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

    @Provides
    @Singleton
    fun provideLoggingInterceptor(): HttpLoggingInterceptor {
        return HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }
    }

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

    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient, gson: Gson): Retrofit {
        return Retrofit.Builder()
            .baseUrl("https://api-worker.dangduytoan13l.workers.dev/api/")
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
    }

    @Provides
    @Singleton
    fun provideProductApi(retrofit: Retrofit): ProductApi {
        return retrofit.create(ProductApi::class.java)
    }

    @Provides
    @Singleton
    fun provideCartApi(retrofit: Retrofit): CartApi {
        return retrofit.create(CartApi::class.java)
    }

    @Provides
    @Singleton
    fun provideOrderApi(retrofit: Retrofit): OrderApi {
        return retrofit.create(OrderApi::class.java)
    }

    @Provides
    @Singleton
    fun provideUserApi(retrofit: Retrofit): UserApi {
        return retrofit.create(UserApi::class.java)
    }

    @Provides
    @Singleton
    fun provideTicketApi(retrofit: Retrofit): TicketApi {
        return retrofit.create(TicketApi::class.java)
    }
}

    @Provides
    @Singleton
    fun provideWishlistApi(retrofit: Retrofit): com.tgdd.app.data.remote.WishlistApi {
        return retrofit.create(com.tgdd.app.data.remote.WishlistApi::class.java)
    }

    @Provides
    @Singleton
    fun provideReviewApi(retrofit: Retrofit): com.tgdd.app.data.remote.ReviewApi {
        return retrofit.create(com.tgdd.app.data.remote.ReviewApi::class.java)
    }

    @Provides
    @Singleton
    fun providePromoCodeApi(retrofit: Retrofit): com.tgdd.app.data.remote.PromoCodeApi {
        return retrofit.create(com.tgdd.app.data.remote.PromoCodeApi::class.java)
    }
