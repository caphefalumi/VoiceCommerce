package com.tgdd.app.data.local.dao

import androidx.room.*
import com.tgdd.app.data.local.entity.PromoCodeEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface PromoCodeDao {
    @Query("SELECT * FROM promo_codes WHERE expiresAt > :currentTime AND usedCount < usageLimit")
    fun getActivePromoCodes(currentTime: Long = System.currentTimeMillis()): Flow<List<PromoCodeEntity>>

    @Query("SELECT * FROM promo_codes WHERE code = :code LIMIT 1")
    suspend fun getPromoCodeByCode(code: String): PromoCodeEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPromoCode(promoCode: PromoCodeEntity)

    @Update
    suspend fun updatePromoCode(promoCode: PromoCodeEntity)

    @Query("UPDATE promo_codes SET usedCount = usedCount + 1 WHERE code = :code")
    suspend fun incrementUsageCount(code: String)

    @Delete
    suspend fun deletePromoCode(promoCode: PromoCodeEntity)

    @Query("DELETE FROM promo_codes WHERE expiresAt < :currentTime")
    suspend fun deleteExpiredPromoCodes(currentTime: Long = System.currentTimeMillis())
}
