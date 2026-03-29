package com.tgdd.app.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.tgdd.app.data.local.dao.CartDao
import com.tgdd.app.data.local.dao.OrderDao
import com.tgdd.app.data.local.dao.ProductDao
import com.tgdd.app.data.local.entity.CartItemEntity
import com.tgdd.app.data.local.entity.OrderEntity
import com.tgdd.app.data.local.entity.ProductEntity

@Database(
    entities = [
        ProductEntity::class,
        CartItemEntity::class,
        OrderEntity::class
    ],
    version = 2,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun productDao(): ProductDao
    abstract fun cartDao(): CartDao
    abstract fun orderDao(): OrderDao
}
