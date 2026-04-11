package com.tgdd.app

import com.tgdd.app.data.local.dao.CartDao
import com.tgdd.app.data.local.entity.CartItemEntity
import com.tgdd.app.data.local.entity.ProductEntity
import com.tgdd.app.data.network.NetworkObserver
import com.tgdd.app.data.remote.CartApi
import com.tgdd.app.data.repository.CartRepository
import io.mockk.unmockkObject
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkObject
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Before
import org.junit.Test

@OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
class CartRepositoryTest {

    private lateinit var cartDao: CartDao
    private lateinit var cartApi: CartApi
    private lateinit var cartRepository: CartRepository

    private val testCartItem = CartItemEntity(
        id = 1L,
        productId = "prod-001",
        name = "Test Product",
        image = "https://example.com/image.jpg",
        price = 99.99,
        quantity = 2
    )

    private val testCartItemList = listOf(testCartItem)

    private val testProduct = ProductEntity(
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

    private val newCartItem = CartItemEntity(
        id = 0L,
        productId = "prod-002",
        name = "New Product",
        image = "https://example.com/new.jpg",
        price = 49.99,
        quantity = 1
    )

    @Before
    fun setup() {
        cartDao = mockk(relaxed = true)
        cartApi = mockk(relaxed = true)
        cartRepository = CartRepository(cartDao, cartApi)
        mockkObject(NetworkObserver)
        every { NetworkObserver.isCurrentlyConnected() } returns false
    }

    @After
    fun tearDown() {
        unmockkObject(NetworkObserver)
    }

    @Test
    fun `getCartItems returns Flow of cart items`() = runTest {
        every { cartDao.getCartItems() } returns flowOf(testCartItemList)

        val result = cartRepository.getCartItems()

        val items = result.first()
        assert(items == testCartItemList)
        coVerify { cartDao.getCartItems() }
    }

    @Test
    fun `getAllCartItems returns Flow of all cart items`() = runTest {
        every { cartDao.getCartItems() } returns flowOf(testCartItemList)

        val result = cartRepository.getAllCartItems()

        val items = result.first()
        assert(items == testCartItemList)
        coVerify { cartDao.getCartItems() }
    }

    @Test
    fun `getCartItemCount returns item count`() = runTest {
        every { cartDao.getCartItemCount() } returns flowOf(5)

        val result = cartRepository.getCartItemCount()

        val count = result.first()
        assert(count == 5)
    }

    @Test
    fun `getCartTotal returns total price`() = runTest {
        every { cartDao.getCartTotal() } returns flowOf(299.97)

        val result = cartRepository.getCartTotal()

        val total = result.first()
        assert(total == 299.97)
    }

    @Test
    fun `calculateItemTotal calculates price times quantity`() {
        val total = cartRepository.calculateItemTotal(testCartItem)
        assert(total == 199.98)
    }

    @Test
    fun `addToCart inserts new item when not existing`() = runTest {
        coEvery { cartDao.getCartItemByProductId("prod-002") } returns null

        cartRepository.addToCart(newCartItem)

        coVerify { cartDao.insertCartItem(newCartItem) }
    }

    @Test
    fun `addToCart updates quantity when product already in cart`() = runTest {
        val existingItem = testCartItem.copy(quantity = 1)
        // When adding testCartItem (quantity=2) to existing (quantity=1), result is 1+2=3
        val updatedItem = existingItem.copy(quantity = 3)

        coEvery { cartDao.getCartItemByProductId("prod-001") } returns existingItem

        cartRepository.addToCart(testCartItem)

        coVerify { cartDao.updateCartItem(updatedItem) }
    }

    @Test
    fun `addToCart with ProductEntity inserts new item`() = runTest {
        coEvery { cartDao.getCartItemByProductId("prod-001") } returns null

        cartRepository.addToCart(testProduct)

        coVerify {
            cartDao.insertCartItem(match { item ->
                item.productId == "prod-001" && item.quantity == 1
            })
        }
    }

    @Test
    fun `addToCart with ProductEntity increments quantity when existing`() = runTest {
        coEvery { cartDao.getCartItemByProductId("prod-001") } returns testCartItem

        cartRepository.addToCart(testProduct)

        coVerify {
            cartDao.updateCartItem(match { item ->
                item.quantity == 3
            })
        }
    }

    @Test
    fun `updateCartItem updates the cart item`() = runTest {
        cartRepository.updateCartItem(testCartItem)

        coVerify { cartDao.updateCartItem(testCartItem) }
    }

    @Test
    fun `updateQuantity updates quantity when quantity is valid`() = runTest {
        cartRepository.updateQuantity(1L, 5)

        coVerify { cartDao.updateQuantity(1L, 5) }
    }

    @Test
    fun `updateQuantity removes item when quantity is less than 1`() = runTest {
        cartRepository.updateQuantity(1L, 0)

        coVerify { cartDao.removeCartItemById(1L) }
    }

    @Test
    fun `updateQuantity removes item for negative quantity`() = runTest {
        cartRepository.updateQuantity(1L, -1)

        coVerify { cartDao.removeCartItemById(1L) }
    }

    @Test
    fun `removeFromCart removes item by ID`() = runTest {
        every { cartDao.getCartItems() } returns flowOf(testCartItemList)

        cartRepository.removeFromCart(1L)

        coVerify { cartDao.removeCartItemById(1L) }
    }

    @Test
    fun `removeFromCart removes item by entity`() = runTest {
        cartRepository.removeFromCart(testCartItem)

        coVerify { cartDao.deleteCartItem(testCartItem) }
    }

    @Test
    fun `removeByProductId removes item by product ID`() = runTest {
        cartRepository.removeByProductId("prod-001")

        coVerify { cartDao.removeCartItemByProductId("prod-001") }
    }

    @Test
    fun `clearCart deletes all items`() = runTest {
        cartRepository.clearCart()

        coVerify { cartDao.clearCart() }
    }
}
