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

/**
 * Repository for product data with network-first caching strategy.
 * 
 * Data Source Strategy: Network-first with Room cache fallback
 * 
 * ## Read Flow (Cache-First):
 * 1. Check network connectivity first
 * 2. If online: fetch from API and cache results in Room
 * 3. If offline OR API fails: return cached data from Room
 * 4. If no cache available offline: return failure
 * 
 * ## Write Flow:
 * 1. Write operations are local-only (Room)
 * 2. Cache can be manually cleared via [clearCache]
 * 
 * ## Caching Mechanism:
 * - [ProductDao] (Room) for persistent local cache
 * - Cache stores complete product entities for offline access
 * - Search results are cached to enable offline search
 * 
 * @see ProductApi For network operations
 * @see ProductDao For local caching operations
 */
class ProductRepository @Inject constructor(
    private val productDao: ProductDao,
    private val productApi: ProductApi
) {
    /**
     * Fetches all products with network-first strategy and Room cache fallback.
     * 
     * Flow: Network fetch → Cache in Room → Return data
     * Fallback: Room cache (when offline or API fails)
     * 
     * @return Result containing list of all products
     */
    suspend fun getProducts(): Result<List<ProductEntity>> = withContext(Dispatchers.IO) {
        // Offline check: return cached data if available, otherwise fail
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
                // Cache fetched products in Room for offline access
                productDao.insertProducts(entities)
                Result.success(entities)
            } else {
                // API error: try Room fallback
                val cached = productDao.getAllProducts().firstOrNull() ?: emptyList()
                if (cached.isNotEmpty()) {
                    Result.success(cached)
                } else {
                    Result.failure(Exception("API error: ${response.code()} - ${response.message()}"))
                }
            }
        } catch (e: Exception) {
            // Network error: try Room fallback
            val cached = productDao.getAllProducts().firstOrNull() ?: emptyList()
            if (cached.isNotEmpty()) {
                Result.success(cached)
            } else {
                Result.failure(e)
            }
        }
    }

    /**
     * Fetches a single product by ID with cache update.
     * 
     * Always attempts network fetch first, then updates cache.
     * Falls back to cache if offline or API fails.
     * 
     * @param id Product ID to fetch
     * @return Result containing the product entity
     */
    suspend fun getProductById(id: String): Result<ProductEntity> = withContext(Dispatchers.IO) {
        // Offline: return cached product if available
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
                    // Update cache with fresh data
                    productDao.insertProduct(entity)
                    Result.success(entity)
                } else {
                    Result.failure(Exception("Product not found"))
                }
            } else {
                // API error: fallback to cache
                val cached = productDao.getProductById(id)
                if (cached != null) {
                    Result.success(cached)
                } else {
                    Result.failure(Exception("API error: ${response.code()} - ${response.message()}"))
                }
            }
        } catch (e: Exception) {
            // Network error: fallback to cache
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
