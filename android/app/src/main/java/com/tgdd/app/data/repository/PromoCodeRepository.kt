package com.tgdd.app.data.repository

import android.util.Log
import com.tgdd.app.data.local.dao.PromoCodeDao
import com.tgdd.app.data.local.entity.PromoCodeEntity
import com.tgdd.app.data.model.PromoCodeDto
import com.tgdd.app.data.network.NetworkObserver
import com.tgdd.app.data.remote.PromoCodeApi
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

/**
 * Repository for promo code management with hybrid caching strategy.
 * 
 * Data Source Strategy: Local-first with server validation
 * 
 * ## Read Flow (Local-First):
 * 1. Validate locally first using cached promo codes
 * 2. If online, validate with server for accurate usage counts
 * 3. Fall back to local calculation if offline
 * 
 * ## Write Flow:
 * 1. Increment usage count locally
 * 2. Notify server of usage (best-effort)
 * 3. Sync promo codes periodically from server
 * 
 * ## Caching Mechanism:
 * - [PromoCodeDao] (Room) for local promo code cache
 * - Promo codes cached for offline validation
 * - Server provides authoritative usage counts when online
 * 
 * @see PromoCodeDao For local promo code storage
 * @see PromoCodeApi For server operations
 */
class PromoCodeRepository @Inject constructor(
    private val promoCodeDao: PromoCodeDao,
    private val promoCodeApi: PromoCodeApi
) {
    /**
     * Result of applying a coupon to an order.
     */
    data class CouponApplyResult(
        val couponCode: String,
        val discountAmount: Double,
        val finalTotal: Double,
        val message: String?
    )

    /**
     * Observes active promo codes from local cache.
     * 
     * @return Flow emitting list of active promo codes
     */
    fun getActivePromoCodes(): Flow<List<PromoCodeEntity>> =
        promoCodeDao.getActivePromoCodes()

    /**
     * Validates a promo code and calculates discount locally.
     * 
     * Validation Strategy: Local-first with server override
     * 1. Check if code exists locally
     * 2. Check expiration, usage limits, minimum order
     * 3. If online, validate with server for accurate count
     * 
     * @param code Promo code to validate
     * @param orderTotal Order subtotal
     * @return Result containing calculated discount amount
     */
    suspend fun validatePromoCode(code: String, orderTotal: Double): Result<Double> {
        // Check local cache first
        val promoCode = promoCodeDao.getPromoCodeByCode(code)
            ?: return Result.failure(Exception("Mã giảm giá không tồn tại"))

        // Validate expiration
        if (promoCode.expiresAt < System.currentTimeMillis()) {
            return Result.failure(Exception("Mã giảm giá đã hết hạn"))
        }

        // Validate usage count
        if (promoCode.usedCount >= promoCode.usageLimit) {
            return Result.failure(Exception("Mã giảm giá đã hết lượt sử dụng"))
        }

        // Validate minimum order value
        if (orderTotal < promoCode.minOrderValue) {
            return Result.failure(
                Exception("Đơn hàng tối thiểu ${promoCode.minOrderValue.toInt()}đ để sử dụng mã này")
            )
        }

        // Calculate local discount
        val discount = calculateDiscount(promoCode, orderTotal)
        
        // Validate with server if online (for accurate usage count)
        if (NetworkObserver.isCurrentlyConnected()) {
            try {
                val request = com.tgdd.app.data.model.ApiResponses.PromoCodeValidationRequest(
                    code = code,
                    orderTotal = orderTotal
                )
                val response = promoCodeApi.validatePromoCode(request)
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

        // Return local calculation if server validation fails
        return Result.success(discount)
    }

    /**
     * Applies a promo code and returns discount information.
     * 
     * @param code Promo code to apply
     * @param orderTotal Order subtotal
     * @return Result containing (discount, finalTotal) pair
     */
    suspend fun applyPromoCode(code: String, orderTotal: Double): Result<Pair<Double, Double>> {
        // Validate code
        val validationResult = validatePromoCode(code, orderTotal)
        if (validationResult.isFailure) {
            return Result.failure(validationResult.exceptionOrNull() ?: Exception("Promo code validation failed"))
        }

        val discount = validationResult.getOrThrow()
        val finalTotal = (orderTotal - discount).coerceAtLeast(0.0)

        // Increment usage count locally
        promoCodeDao.incrementUsageCount(code)

        // Notify server of usage (best-effort)
        if (NetworkObserver.isCurrentlyConnected()) {
            try {
                val request = com.tgdd.app.data.model.ApiResponses.PromoCodeApplicationRequest(
                    code = code,
                    orderTotal = orderTotal
                )
                promoCodeApi.applyPromoCode(request)
            } catch (e: Exception) {
                Log.e(TAG, "Apply promo code sync failed: ${e.message}", e)
            }
        }

        return Result.success(Pair(discount, finalTotal))
    }

    /**
     * Applies a coupon with full server validation.
     * 
     * Falls back to local validation if offline.
     * 
     * @param code Coupon code
     * @param orderTotal Order subtotal
     * @param userId User ID (optional)
     * @return Result containing CouponApplyResult
     */
    suspend fun applyCoupon(code: String, orderTotal: Double, userId: String?): Result<CouponApplyResult> {
        // Offline: use local validation
        if (!NetworkObserver.isCurrentlyConnected()) {
            val localValidation = validatePromoCode(code, orderTotal)
            if (localValidation.isFailure) {
                return Result.failure(localValidation.exceptionOrNull() ?: Exception("Coupon validation failed"))
            }
            val discount = localValidation.getOrThrow()
            val finalTotal = (orderTotal - discount).coerceAtLeast(0.0)
            return Result.success(
                CouponApplyResult(
                    couponCode = code.uppercase(),
                    discountAmount = discount,
                    finalTotal = finalTotal,
                    message = "Áp dụng mã giảm giá thành công"
                )
            )
        }

        // Online: validate with server
        return try {
            val request = com.tgdd.app.data.model.ApiResponses.CouponApplyRequest(
                code = code,
                orderTotal = orderTotal,
                userId = userId
            )

            val response = promoCodeApi.applyCoupon(request)
            val body = response.body()

            if (!response.isSuccessful || body == null || !body.success) {
                return Result.failure(Exception(body?.error ?: "Mã giảm giá không hợp lệ"))
            }

            Result.success(
                CouponApplyResult(
                    couponCode = body.couponCode ?: code.uppercase(),
                    discountAmount = body.discountAmount ?: 0.0,
                    finalTotal = body.finalTotal ?: orderTotal,
                    message = body.message
                )
            )
        } catch (e: Exception) {
            Log.e(TAG, "Apply coupon failed: ${e.message}", e)
            Result.failure(e)
        }
    }

    /**
     * Calculates discount for a promo code.
     * 
     * Supports percentage and fixed amount discounts.
     * Respects maximum discount cap if set.
     * 
     * @param promoCode Promo code entity
     * @param orderTotal Order subtotal
     * @return Calculated discount amount
     */
    private fun calculateDiscount(promoCode: PromoCodeEntity, orderTotal: Double): Double {
        val discount = when (promoCode.discountType) {
            "percentage" -> orderTotal * (promoCode.discountValue / 100.0)
            "fixed" -> promoCode.discountValue
            else -> 0.0
        }

        // Apply maximum discount cap if set
        return if (promoCode.maxDiscount != null) {
            discount.coerceAtMost(promoCode.maxDiscount)
        } else {
            discount
        }
    }

    /**
     * Syncs promo codes from server to local cache.
     * 
     * Sync Strategy: Refresh
     * 1. Deletes expired codes
     * 2. Inserts current active codes from server
     * 
     * Call periodically to keep promo codes up-to-date.
     */
    suspend fun syncPromoCodes() {
        if (!NetworkObserver.isCurrentlyConnected()) {
            Log.w(TAG, "Cannot sync promo codes: no network connection")
            return
        }
        try {
            val response = promoCodeApi.getActivePromoCodes()
            if (response.isSuccessful) {
                response.body()?.promoCodes?.let { codes ->
                    // Remove expired codes and insert fresh ones
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
