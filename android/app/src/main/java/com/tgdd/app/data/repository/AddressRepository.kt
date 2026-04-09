package com.tgdd.app.data.repository

import com.tgdd.app.data.local.dao.AddressDao
import com.tgdd.app.data.local.entity.AddressEntity
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class AddressRepository @Inject constructor(
    private val addressDao: AddressDao
) {
    fun getAddressesByUserId(userId: String): Flow<List<AddressEntity>> =
        addressDao.getAddressesByUserId(userId)

    suspend fun getDefaultAddress(userId: String): AddressEntity? =
        addressDao.getDefaultAddress(userId)

    suspend fun getAddressById(id: Long): AddressEntity? =
        addressDao.getAddressById(id)

    suspend fun insertAddress(address: AddressEntity): Long {
        if (address.isDefault) {
            addressDao.clearDefaultFlags(address.userId)
        }
        return addressDao.insertAddress(address)
    }

    suspend fun updateAddress(address: AddressEntity) {
        if (address.isDefault) {
            addressDao.clearDefaultFlags(address.userId)
        }
        addressDao.updateAddress(address)
    }

    suspend fun deleteAddress(address: AddressEntity) {
        addressDao.deleteAddress(address)
    }

    suspend fun setAsDefault(addressId: Long, userId: String) {
        addressDao.clearDefaultFlags(userId)
        addressDao.setAsDefault(addressId)
    }
}
