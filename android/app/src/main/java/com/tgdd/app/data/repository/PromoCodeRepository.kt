package com.tgdd.app.data.repository

import android.util.Log
import com.tgdd.app.data.local.dao.PromoCodeDao
import com.tgdd.app.data.local.entity.PromoCodeEntity
import com.tgdd.app.data.model.PromoCodeDto
import com.tgdd.app.data.network.NetworkObserver
import com.tgdd.app.data.remote.PromoCodeApi
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class PromoCodeRepository @Inject constructor(
    private val promoCodeDao: PromoCodeDao,
    private val promoCodeApi: PromoCodeApi
) {
    fun getActivePromoCodes(): Flow<List<PromoCodeEntity>> =
        promoCodeDao.getActivePromoCodes()

    suspend fun validatePromoCode(code: String, orderTotal: Double): Result<Double> {
        val promoCode = promoCodeDao.getPromoCodeByCode(code)
            ?: return Result.failure(Exception("Mã giảm giá không tồn tại"))

        if (promoCode.expiresAt < System.currentTimeMillis()) {
            return Result.failure(Exception("Mã giảm giá đã hết hạn"))
        }

        if (promoCode.usedCount >= promoCode.usageLimit) {
            return Result.failure(Exception("Mã giảm giá đã hết lượt sử dụng"))
        }

        if (orderTotal < promoCode.minOrderValue) {
            return Result.failure(
                Exception("Đơn hàng tối thiểu ${promoCode.minOrderValue.toInt()}đ để sử dụng mã này")
            )
        }

        val discount = calculateDiscount(promoCode, orderTotal)
        
        // Validate with server if online
        if (NetworkObserver.isCurrentlyConnected()) {
            try {
                val response = promoCodeApi.validatePromoCode(
                    mapOf(
                        "code" to code,
                        "order_total" to orderTotal
                    )
                )
                if (response.isSuccessful) {
                    val serverDiscount = response.body()?.discountAmount
                    if (serverDiscount != null) {
                        return Result.success(serverDiscount)
                    }
                } else {
                    return Result.failure(
                        Exception(response.body()?.error ?: "Mã giảm giá không hợp lệ")
                    )
                }
            } catch (e: Exception) {
                Log.e(TAG, "Validate promo code failed: ${e.message}", e)
            }
        }

        return Result.success(discount)
    }

    suspend fun applyPromoCode(code: String, orderTotal: Double): Result<Pair<Double, Double>> {
        val validationResult = validatePromoCode(code, orderTotal)
        if (validationResult.isFailure) {
            return Result.failure(validationResult.exceptionOrNull()!!)
        }

        val discount = validationResult.getOrThrow()
        val finalTotal = (orderTotal - discount).coerceAtLeast(0.0)

        promoCodeDao.incrementUsageCount(code)

        if (NetworkObserver.isCurrentlyConnected()) {
            try {
                promoCodeApi.applyPromoCode(
                    mapOf(
                        "code" to code,
                        "order_total" to orderTotal
                    )
                )
            } catch (e: Exception) {
                Log.e(TAG, "Apply promo code sync failed: ${e.message}", e)
            }
        }

        return Result.success(Pair(discount, finalTotal))
    }

    private fun calculateDiscount(promoCode: PromoCodeEntity, orderTotal: Double): Double {
        val discount = when (promoCode.discountType) {
            "percentage" -> orderTotal * (promoCode.discountValue / 100.0)
            "fixed" -> promoCode.discountValue
            else -> 0.0
        }

        return if (promoCode.maxDiscount != null) {
            discount.coerceAtMost(promoCode.maxDiscount)
        } else {
            discount
        }
    }

    suspend fun syncPromoCodes() {
        if (!NetworkObserver.isCurrentlyConnected()) {
            Log.w(TAG, "Cannot sync promo codes: no network connection")
            return
        }
        try {
            val response = promoCodeApi.getActivePromoCodes()
            if (response.isSuccessful) {
                response.body()?.promoCodes?.let { codes ->
                    promoCodeDao.deleteExpiredPromoCodes()
                    codes.forEach { dto ->
                        promoCodeDao.insertPromoCode(dto.toEntity())
                    }
                    Log.d(TAG, "Synced ${codes.size} promo codes")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Sync promo codes failed: ${e.message}", e)
        }
    }

    companion object {
        private const val TAG = "PromoCodeRepository"
    }
}

fun PromoCodeDto.toEntity(): PromoCodeEntity {
    return PromoCodeEntity(
        code = this.code,
        discountType = this.discountType,
        discountValue = this.discountValue,
        minOrderValue = this.minOrderValue,
        maxDiscount = this.maxDiscount,
        expiresAt = this.expiresAt,
        description = this.description
    )
}
