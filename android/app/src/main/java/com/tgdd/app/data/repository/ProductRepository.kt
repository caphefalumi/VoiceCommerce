package com.tgdd.app.data.repository

import com.tgdd.app.data.local.dao.ProductDao
import com.tgdd.app.data.local.entity.ProductEntity
import com.tgdd.app.data.model.ProductDto
import com.tgdd.app.data.network.NetworkObserver
import com.tgdd.app.data.remote.ProductApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.withContext
import javax.inject.Inject

class ProductRepository @Inject constructor(
    private val productDao: ProductDao,
    private val productApi: ProductApi
) {
    suspend fun getProducts(): Result<List<ProductEntity>> = withContext(Dispatchers.IO) {
        if (!NetworkObserver.isCurrentlyConnected()) {
            val cached = productDao.getAllProducts().firstOrNull() ?: emptyList()
            return@withContext if (cached.isNotEmpty()) {
                Result.success(cached)
            } else {
                Result.failure(Exception("No internet connection"))
            }
        }
        try {
            val response = productApi.getProducts()
            if (response.isSuccessful) {
                val products = response.body()?.products ?: emptyList()
                val entities = products.map { it.toEntity() }
                productDao.insertProducts(entities)
                Result.success(entities)
            } else {
                val cached = productDao.getAllProducts().firstOrNull() ?: emptyList()
                if (cached.isNotEmpty()) {
                    Result.success(cached)
                } else {
                    Result.failure(Exception("API error: ${response.code()} - ${response.message()}"))
                }
            }
        } catch (e: Exception) {
            val cached = productDao.getAllProducts().firstOrNull() ?: emptyList()
            if (cached.isNotEmpty()) {
                Result.success(cached)
            } else {
                Result.failure(e)
            }
        }
    }

    suspend fun getProductById(id: String): Result<ProductEntity> = withContext(Dispatchers.IO) {
        if (!NetworkObserver.isCurrentlyConnected()) {
            val cached = productDao.getProductById(id)
            return@withContext if (cached != null) {
                Result.success(cached)
            } else {
                Result.failure(Exception("No internet connection"))
            }
        }
        try {
            val response = productApi.getProductById(id)
            if (response.isSuccessful) {
                val product = response.body()?.product
                if (product != null) {
                    val entity = product.toEntity()
                    productDao.insertProduct(entity)
                    Result.success(entity)
                } else {
                    Result.failure(Exception("Product not found"))
                }
            } else {
                val cached = productDao.getProductById(id)
                if (cached != null) {
                    Result.success(cached)
                } else {
                    Result.failure(Exception("API error: ${response.code()} - ${response.message()}"))
                }
            }
        } catch (e: Exception) {
            val cached = productDao.getProductById(id)
            if (cached != null) {
                Result.success(cached)
            } else {
                Result.failure(e)
            }
        }
    }

    suspend fun searchProducts(query: String): Result<List<ProductEntity>> = withContext(Dispatchers.IO) {
        if (!NetworkObserver.isCurrentlyConnected()) {
            val cached = productDao.searchProducts(query).firstOrNull() ?: emptyList()
            return@withContext if (cached.isNotEmpty()) {
                Result.success(cached)
            } else {
                Result.failure(Exception("No internet connection"))
            }
        }
        try {
            val response = productApi.searchProducts(query)
            if (response.isSuccessful) {
                val products = response.body()?.products ?: emptyList()
                val entities = products.map { it.toEntity() }
                // Cache search results so offline search works
                if (entities.isNotEmpty()) productDao.insertProducts(entities)
                Result.success(entities)
            } else {
                val cached = productDao.searchProducts(query).firstOrNull() ?: emptyList()
                if (cached.isNotEmpty()) {
                    Result.success(cached)
                } else {
                    Result.failure(Exception("API error: ${response.code()} - ${response.message()}"))
                }
            }
        } catch (e: Exception) {
            val cached = productDao.searchProducts(query).firstOrNull() ?: emptyList()
            if (cached.isNotEmpty()) {
                Result.success(cached)
            } else {
                Result.failure(e)
            }
        }
    }

    suspend fun getProductDtoById(id: String): ProductDto? = withContext(Dispatchers.IO) {
        return@withContext try {
            val response = productApi.getProductById(id)
            if (response.isSuccessful) response.body()?.product else null
        } catch (_: Exception) { null }
    }

    suspend fun clearCache() = withContext(Dispatchers.IO) {
        productDao.deleteAllProducts()
    }

    suspend fun insertProduct(product: ProductEntity) = withContext(Dispatchers.IO) {
        productDao.insertProduct(product)
    }

    suspend fun deleteProduct(product: ProductEntity) = withContext(Dispatchers.IO) {
        productDao.deleteProduct(product)
    }

    suspend fun getProductsByCategory(category: String): Result<List<ProductEntity>> = withContext(Dispatchers.IO) {
        if (!NetworkObserver.isCurrentlyConnected()) {
            val cached = productDao.getProductsByCategory(category).firstOrNull() ?: emptyList()
            return@withContext if (cached.isNotEmpty()) {
                Result.success(cached)
            } else {
                Result.failure(Exception("No internet connection"))
            }
        }
        try {
            val response = productApi.getProductsByCategory(category)
            if (response.isSuccessful) {
                val products = response.body()?.products ?: emptyList()
                val entities = products.map { it.toEntity() }
                Result.success(entities)
            } else {
                val cached = productDao.getProductsByCategory(category).firstOrNull() ?: emptyList()
                if (cached.isNotEmpty()) {
                    Result.success(cached)
                } else {
                    Result.failure(Exception("API error: ${response.code()} - ${response.message()}"))
                }
            }
        } catch (e: Exception) {
            val cached = productDao.getProductsByCategory(category).firstOrNull() ?: emptyList()
            if (cached.isNotEmpty()) {
                Result.success(cached)
            } else {
                Result.failure(e)
            }
        }
    }

    suspend fun getProductsByBrand(brand: String): Result<List<ProductEntity>> = withContext(Dispatchers.IO) {
        if (!NetworkObserver.isCurrentlyConnected()) {
            val cached = productDao.searchProducts(brand).firstOrNull() ?: emptyList()
            return@withContext if (cached.isNotEmpty()) {
                Result.success(cached)
            } else {
                Result.failure(Exception("No internet connection"))
            }
        }
        try {
            val response = productApi.searchProducts(brand)
            if (response.isSuccessful) {
                val products = response.body()?.products ?: emptyList()
                val entities = products.map { it.toEntity() }
                Result.success(entities)
            } else {
                val cached = productDao.searchProducts(brand).firstOrNull() ?: emptyList()
                if (cached.isNotEmpty()) {
                    Result.success(cached)
                } else {
                    Result.failure(Exception("API error: ${response.code()} - ${response.message()}"))
                }
            }
        } catch (e: Exception) {
            val cached = productDao.searchProducts(brand).firstOrNull() ?: emptyList()
            if (cached.isNotEmpty()) {
                Result.success(cached)
            } else {
                Result.failure(e)
            }
        }
    }
}

fun ProductDto.toEntity(): ProductEntity {
    return ProductEntity(
        id = this.id,
        name = this.name,
        price = this.price,
        originalPrice = this.originalPrice,
        image = this.getFirstImage(),
        category = this.category,
        description = this.description ?: "",
        rating = this.rating,
        reviewCount = this.reviewCount,
        brand = this.brand,
        inStock = this.inStock
    )
}
