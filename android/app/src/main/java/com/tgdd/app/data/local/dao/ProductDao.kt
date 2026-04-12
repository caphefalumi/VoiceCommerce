package com.tgdd.app.data.local.dao

import androidx.room.*
import com.tgdd.app.data.local.entity.ProductEntity
import kotlinx.coroutines.flow.Flow

/**
 * Data Access Object for product database operations.
 *
 * Operations:
 * - getAllProducts(): Fetch all cached products sorted by creation date
 * - getProductById(): Get single product by ID
 * - searchProducts(): Search products by name or category
 * - getProductsByCategory(): Get products filtered by category
 * - insertProducts(): Cache network response (bulk insert)
 * - insertProduct(): Cache single product
 * - deleteProduct(): Remove product from cache
 * - deleteAllProducts(): Clear entire product cache
 *
 * Transactions:
 * - All write operations are transaction-safe
 *
 * @see com.tgdd.app.data.local.entity.ProductEntity For entity definition
 */
@Dao
interface ProductDao {
    @Query("SELECT * FROM products ORDER BY createdAt DESC")
    fun getAllProducts(): Flow<List<ProductEntity>>
    
    @Query("SELECT * FROM products WHERE id = :productId")
    suspend fun getProductById(productId: String): ProductEntity?
    
    @Query("SELECT * FROM products WHERE name LIKE '%' || :query || '%' OR category LIKE '%' || :query || '%'")
    fun searchProducts(query: String): Flow<List<ProductEntity>>
    
    @Query("SELECT * FROM products WHERE category = :category ORDER BY createdAt DESC")
    fun getProductsByCategory(category: String): Flow<List<ProductEntity>>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProducts(products: List<ProductEntity>)
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProduct(product: ProductEntity)
    
    @Delete
    suspend fun deleteProduct(product: ProductEntity)
    
    @Query("DELETE FROM products")
    suspend fun deleteAllProducts()
}
