package com.tgdd.app

import androidx.lifecycle.ViewModelStore
import androidx.lifecycle.ViewModelStoreOwner
import androidx.test.core.app.ActivityScenario
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.tgdd.app.ui.cart.CartFragment
import com.tgdd.app.ui.detail.ProductDetailFragment
import dagger.hilt.android.testing.HiltAndroidRule
import dagger.hilt.android.testing.HiltAndroidTest
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
@HiltAndroidTest
class CartTest {

    @get:Rule
    val hiltRule = HiltAndroidRule(this)

    private lateinit var activityScenario: ActivityScenario<MainActivity>

    @Before
    fun setup() {
        hiltRule.inject()
    }

    @Test
    fun testEmptyCartState() {
        activityScenario = ActivityScenario.launch(MainActivity::class.java)

        activityScenario.onActivity { activity ->
            activity.supportFragmentManager.beginTransaction()
                .replace(R.id.nav_host_fragment, CartFragment())
                .commitAllowingStateLoss()
        }

        Thread.sleep(500)

        onView(withId(R.id.emptyView))
            .check(matches(isDisplayed()))

        onView(withText(R.string.continue_shopping))
            .check(matches(isDisplayed()))
    }

    @Test
    fun testContinueShoppingButtonVisibleInEmptyCart() {
        activityScenario = ActivityScenario.launch(MainActivity::class.java)

        activityScenario.onActivity { activity ->
            activity.supportFragmentManager.beginTransaction()
                .replace(R.id.nav_host_fragment, CartFragment())
                .commitAllowingStateLoss()
        }

        Thread.sleep(500)

        onView(withId(R.id.continueShoppingButton))
            .check(matches(isDisplayed()))
    }

    @Test
    fun testCartToolbarPresent() {
        activityScenario = ActivityScenario.launch(MainActivity::class.java)

        activityScenario.onActivity { activity ->
            activity.supportFragmentManager.beginTransaction()
                .replace(R.id.nav_host_fragment, CartFragment())
                .commitAllowingStateLoss()
        }

        Thread.sleep(500)

        onView(withId(R.id.toolbar))
            .check(matches(isDisplayed()))
    }

    @Test
    fun testCartRecyclerViewPresent() {
        activityScenario = ActivityScenario.launch(MainActivity::class.java)

        activityScenario.onActivity { activity ->
            activity.supportFragmentManager.beginTransaction()
                .replace(R.id.nav_host_fragment, CartFragment())
                .commitAllowingStateLoss()
        }

        Thread.sleep(500)

        onView(withId(R.id.recyclerView))
            .check(matches(isDisplayed()))
    }

    @Test
    fun testCheckoutButtonPresent() {
        activityScenario = ActivityScenario.launch(MainActivity::class.java)

        activityScenario.onActivity { activity ->
            activity.supportFragmentManager.beginTransaction()
                .replace(R.id.nav_host_fragment, CartFragment())
                .commitAllowingStateLoss()
        }

        Thread.sleep(500)

        onView(withId(R.id.checkoutButton))
            .check(matches(isDisplayed()))
    }

    @Test
    fun testClearCartButtonPresent() {
        activityScenario = ActivityScenario.launch(MainActivity::class.java)

        activityScenario.onActivity { activity ->
            activity.supportFragmentManager.beginTransaction()
                .replace(R.id.nav_host_fragment, CartFragment())
                .commitAllowingStateLoss()
        }

        Thread.sleep(500)

        onView(withId(R.id.clearCartButton))
            .check(matches(isDisplayed()))
    }
}
