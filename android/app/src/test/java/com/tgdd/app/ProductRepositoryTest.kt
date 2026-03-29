package com.tgdd.app

import com.tgdd.app.data.local.dao.ProductDao
import com.tgdd.app.data.local.entity.ProductEntity
import com.tgdd.app.data.model.ProductDto
import com.tgdd.app.data.remote.ProductApi
import com.tgdd.app.data.repository.ProductRepository
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.runTest
import org.junit.Before
import org.junit.Test
import retrofit2.Response

@OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
class ProductRepositoryTest {

    private lateinit var productDao: ProductDao
    private lateinit var productApi: ProductApi
    private lateinit var productRepository: ProductRepository

    private val testProductDto = ProductDto(
        id = "prod-001",
        name = "Test Product",
        price = 99.99,
        originalPrice = 129.99,
        image = "https://example.com/image.jpg",
        category = "Electronics",
        description = "A test product",
        rating = 4.5f,
        reviewCount = 100,
        brand = "TestBrand",
        inStock = true
    )

    private val testProductEntity = ProductEntity(
        id = "prod-001",
        name = "Test Product",
        price = 99.99,
        originalPrice = 129.99,
        image = "https://example.com/image.jpg",
        category = "Electronics",
        description = "A test product",
        rating = 4.5f,
        reviewCount = 100,
        brand = "TestBrand",
        inStock = true
    )

    private val testProductList = listOf(testProductEntity)

    @Before
    fun setup() {
        productDao = mockk(relaxed = true)
        productApi = mockk(relaxed = true)
        productRepository = ProductRepository(productDao, productApi)
    }

    @Test
    fun `getProducts fetches from API and caches to Room on success`() = runTest {
        val apiResponse = Response.success(listOf(testProductDto))
        coEvery { productApi.getProducts() } returns apiResponse

        val result = productRepository.getProducts()

        assert(result.isSuccess)
        val products = result.getOrNull()
        assert(products?.size == 1)
        assert(products?.first()?.id == "prod-001")
        assert(products?.first()?.name == "Test Product")
        coVerify { productDao.insertProducts(any()) }
    }

    @Test
    fun `getProducts falls back to Room on API error`() = runTest {
        val apiResponse = Response.error<List<ProductDto>>(500, okhttp3.ResponseBody.create(null, "Server Error"))
        coEvery { productApi.getProducts() } returns apiResponse
        coEvery { productDao.getAllProducts() } returns flowOf(testProductList)

        val result = productRepository.getProducts()

        assert(result.isSuccess)
        assert(result.getOrNull() == testProductList)
    }

    @Test
    fun `getProducts returns failure when both API and cache fail`() = runTest {
        val apiResponse = Response.error<List<ProductDto>>(500, okhttp3.ResponseBody.create(null, "Server Error"))
        coEvery { productApi.getProducts() } returns apiResponse
        coEvery { productDao.getAllProducts() } returns flowOf(emptyList())

        val result = productRepository.getProducts()

        assert(result.isFailure)
    }

    @Test
    fun `getProducts returns failure on network exception with empty cache`() = runTest {
        coEvery { productApi.getProducts() } throws Exception("Network error")
        coEvery { productDao.getAllProducts() } returns flowOf(emptyList())

        val result = productRepository.getProducts()

        assert(result.isFailure)
    }

    @Test
    fun `getProducts falls back to cache on network exception`() = runTest {
        coEvery { productApi.getProducts() } throws Exception("Network error")
        coEvery { productDao.getAllProducts() } returns flowOf(testProductList)

        val result = productRepository.getProducts()

        assert(result.isSuccess)
        assert(result.getOrNull() == testProductList)
    }

    @Test
    fun `getProductById returns product from API`() = runTest {
        val apiResponse = Response.success(testProductDto)
        coEvery { productApi.getProductById("prod-001") } returns apiResponse

        val result = productRepository.getProductById("prod-001")

        assert(result.isSuccess)
        assert(result.getOrNull()?.id == "prod-001")
        assert(result.getOrNull()?.name == "Test Product")
        coVerify { productDao.insertProduct(any()) }
    }

    @Test
    fun `getProductById falls back to Room on API error`() = runTest {
        val apiResponse = Response.error<ProductDto>(404, okhttp3.ResponseBody.create(null, "Not Found"))
        coEvery { productApi.getProductById("prod-001") } returns apiResponse
        coEvery { productDao.getProductById("prod-001") } returns testProductEntity

        val result = productRepository.getProductById("prod-001")

        assert(result.isSuccess)
        assert(result.getOrNull()?.id == "prod-001")
    }

    @Test
    fun `getProductById returns failure when not found in cache`() = runTest {
        val apiResponse = Response.error<ProductDto>(404, okhttp3.ResponseBody.create(null, "Not Found"))
        coEvery { productApi.getProductById("prod-001") } returns apiResponse
        coEvery { productDao.getProductById("prod-001") } returns null

        val result = productRepository.getProductById("prod-001")

        assert(result.isFailure)
    }

    @Test
    fun `searchProducts returns filtered results from API`() = runTest {
        val apiResponse = Response.success(listOf(testProductDto))
        coEvery { productApi.searchProducts("Test") } returns apiResponse

        val result = productRepository.searchProducts("Test")

        assert(result.isSuccess)
        assert(result.getOrNull()?.size == 1)
        assert(result.getOrNull()?.first()?.name == "Test Product")
    }

    @Test
    fun `searchProducts falls back to Room search on API error`() = runTest {
        val apiResponse = Response.error<List<ProductDto>>(500, okhttp3.ResponseBody.create(null, "Server Error"))
        coEvery { productApi.searchProducts("Test") } returns apiResponse
        coEvery { productDao.searchProducts("Test") } returns flowOf(testProductList)

        val result = productRepository.searchProducts("Test")

        assert(result.isSuccess)
        assert(result.getOrNull() == testProductList)
    }

    @Test
    fun `searchProducts returns empty list on no results with empty cache`() = runTest {
        val apiResponse = Response.success<List<ProductDto>>(emptyList())
        coEvery { productApi.searchProducts("NonExistent") } returns apiResponse
        coEvery { productDao.searchProducts("NonExistent") } returns flowOf(emptyList())

        val result = productRepository.searchProducts("NonExistent")

        assert(result.isSuccess)
        assert(result.getOrNull()?.isEmpty() == true)
    }

    @Test
    fun `clearCache deletes all products from Room`() = runTest {
        productRepository.clearCache()

        coVerify { productDao.deleteAllProducts() }
    }

    @Test
    fun `insertProduct inserts product to Room`() = runTest {
        productRepository.insertProduct(testProductEntity)

        coVerify { productDao.insertProduct(testProductEntity) }
    }

    @Test
    fun `deleteProduct deletes product from Room`() = runTest {
        productRepository.deleteProduct(testProductEntity)

        coVerify { productDao.deleteProduct(testProductEntity) }
    }
}
