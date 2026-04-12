package com.tgdd.app.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.tgdd.app.data.local.dao.*
import com.tgdd.app.data.local.entity.*

@Database(
    entities = [
        ProductEntity::class,
        OrderEntity::class,
        ReviewEntity::class,
        AddressEntity::class,
        PromoCodeEntity::class,
        SearchHistoryEntity::class
    ],
    version = 5,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun productDao(): ProductDao
    abstract fun orderDao(): OrderDao
    abstract fun reviewDao(): ReviewDao
    abstract fun addressDao(): AddressDao
    abstract fun promoCodeDao(): PromoCodeDao
    abstract fun searchHistoryDao(): SearchHistoryDao
}
