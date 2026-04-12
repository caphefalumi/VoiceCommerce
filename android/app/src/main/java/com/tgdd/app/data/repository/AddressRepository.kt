package com.tgdd.app.data.repository

import com.tgdd.app.data.local.dao.AddressDao
import com.tgdd.app.data.local.entity.AddressEntity
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

/**
 * Repository for shipping address management.
 * 
 * Data Source Strategy: Local-only (Room)
 * 
 * ## Read Flow:
 * 1. All data stored locally in Room
 * 2. No server sync implemented
 * 3. Addresses are user-specific and local to device
 * 
 * ## Write Flow:
 * 1. All operations are local-only
 * 2. Default address logic handled locally
 * 
 * ## Caching Mechanism:
 * - [AddressDao] (Room) as sole data source
 * - No network sync
 * - Data persists across app sessions
 * 
 * @see AddressDao For local address storage
 */
class AddressRepository @Inject constructor(
    private val addressDao: AddressDao
) {
    /**
     * Observes addresses for a user from local storage.
     * 
     * @param userId User ID to get addresses for
     * @return Flow emitting list of addresses
     */
    fun getAddressesByUserId(userId: String): Flow<List<AddressEntity>> =
        addressDao.getAddressesByUserId(userId)

    /**
     * Gets the default address for a user.
     * 
     * @param userId User ID
     * @return Default address or null if none set
     */
    suspend fun getDefaultAddress(userId: String): AddressEntity? =
        addressDao.getDefaultAddress(userId)

    /**
     * Gets a single address by database ID.
     * 
     * @param id Address database ID
     * @return Address entity or null if not found
     */
    suspend fun getAddressById(id: Long): AddressEntity? =
        addressDao.getAddressById(id)

    /**
     * Inserts a new address.
     * 
     * If address is marked as default, clears default flag from
     * other addresses for the same user.
     * 
     * @param address Address to insert
     * @return Database ID of inserted address
     */
    suspend fun insertAddress(address: AddressEntity): Long {
        // If new address is default, clear existing defaults for user
        if (address.isDefault) {
            addressDao.clearDefaultFlags(address.userId)
        }
        return addressDao.insertAddress(address)
    }

    /**
     * Updates an existing address.
     * 
     * If address is marked as default, clears default flag from
     * other addresses for the same user.
     * 
     * @param address Address to update
     */
    suspend fun updateAddress(address: AddressEntity) {
        // If updated address is default, clear existing defaults for user
        if (address.isDefault) {
            addressDao.clearDefaultFlags(address.userId)
        }
        addressDao.updateAddress(address)
    }

    /**
     * Deletes an address.
     * 
     * @param address Address to delete
     */
    suspend fun deleteAddress(address: AddressEntity) {
        addressDao.deleteAddress(address)
    }

    /**
     * Sets an address as the default for a user.
     * 
     * Clears default flag from all other addresses for the user
     * before setting the new default.
     * 
     * @param addressId Address ID to set as default
     * @param userId User ID
     */
    suspend fun setAsDefault(addressId: Long, userId: String) {
        // Clear all defaults first, then set new default
        addressDao.clearDefaultFlags(userId)
        addressDao.setAsDefault(addressId)
    }
}
