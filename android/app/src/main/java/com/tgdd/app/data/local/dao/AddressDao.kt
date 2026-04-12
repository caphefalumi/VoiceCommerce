package com.tgdd.app.data.local.dao

import androidx.room.*
import com.tgdd.app.data.local.entity.AddressEntity
import kotlinx.coroutines.flow.Flow

/**
 * Data Access Object for address database operations.
 *
 * Operations:
 * - getAddressesByUserId(): Fetch all addresses for user (default first)
 * - getDefaultAddress(): Get user's default shipping address
 * - getAddressById(): Get address by ID
 * - insertAddress(): Add new address (returns auto-generated ID)
 * - updateAddress(): Update address details
 * - deleteAddress(): Remove address
 * - clearDefaultFlags(): Clear all default flags for user
 * - setAsDefault(): Set address as default
 *
 * Transactions:
 * - All write operations are transaction-safe
 *
 * @see com.tgdd.app.data.local.entity.AddressEntity For entity definition
 */
@Dao
interface AddressDao {
    @Query("SELECT * FROM addresses WHERE userId = :userId ORDER BY isDefault DESC, id DESC")
    fun getAddressesByUserId(userId: String): Flow<List<AddressEntity>>

    @Query("SELECT * FROM addresses WHERE userId = :userId AND isDefault = 1 LIMIT 1")
    suspend fun getDefaultAddress(userId: String): AddressEntity?

    @Query("SELECT * FROM addresses WHERE id = :id")
    suspend fun getAddressById(id: Long): AddressEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAddress(address: AddressEntity): Long

    @Update
    suspend fun updateAddress(address: AddressEntity)

    @Delete
    suspend fun deleteAddress(address: AddressEntity)

    @Query("UPDATE addresses SET isDefault = 0 WHERE userId = :userId")
    suspend fun clearDefaultFlags(userId: String)

    @Query("UPDATE addresses SET isDefault = 1 WHERE id = :id")
    suspend fun setAsDefault(id: Long)
}
