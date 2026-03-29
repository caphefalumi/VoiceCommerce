package com.tgdd.app

import androidx.test.core.app.ActivityScenario
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.action.ViewActions.closeSoftKeyboard
import androidx.test.espresso.action.ViewActions.scrollTo
import androidx.test.espresso.action.ViewActions.typeText
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.isEnabled
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.tgdd.app.ui.checkout.CheckoutFragment
import dagger.hilt.android.testing.HiltAndroidRule
import dagger.hilt.android.testing.HiltAndroidTest
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
@HiltAndroidTest
class CheckoutTest {

    @get:Rule
    val hiltRule = HiltAndroidRule(this)

    private lateinit var activityScenario: ActivityScenario<MainActivity>

    @Before
    fun setup() {
        hiltRule.inject()
    }

    @Test
    fun testCheckoutFragmentLoads() {
        activityScenario = ActivityScenario.launch(MainActivity::class.java)

        activityScenario.onActivity { activity ->
            activity.supportFragmentManager.beginTransaction()
                .replace(R.id.nav_host_fragment, CheckoutFragment())
                .commitAllowingStateLoss()
        }

        Thread.sleep(500)

        onView(withId(R.id.nameInput))
            .check(matches(isDisplayed()))
        onView(withId(R.id.addressInput))
            .check(matches(isDisplayed()))
        onView(withId(R.id.phoneInput))
            .check(matches(isDisplayed()))
    }

    @Test
    fun testToolbarPresent() {
        activityScenario = ActivityScenario.launch(MainActivity::class.java)

        activityScenario.onActivity { activity ->
            activity.supportFragmentManager.beginTransaction()
                .replace(R.id.nav_host_fragment, CheckoutFragment())
                .commitAllowingStateLoss()
        }

        Thread.sleep(500)

        onView(withId(R.id.toolbar))
            .check(matches(isDisplayed()))
    }

    @Test
    fun testNameInputFieldPresent() {
        activityScenario = ActivityScenario.launch(MainActivity::class.java)

        activityScenario.onActivity { activity ->
            activity.supportFragmentManager.beginTransaction()
                .replace(R.id.nav_host_fragment, CheckoutFragment())
                .commitAllowingStateLoss()
        }

        Thread.sleep(500)

        onView(withId(R.id.nameInput))
            .check(matches(isDisplayed()))
    }

    @Test
    fun testAddressInputFieldPresent() {
        activityScenario = ActivityScenario.launch(MainActivity::class.java)

        activityScenario.onActivity { activity ->
            activity.supportFragmentManager.beginTransaction()
                .replace(R.id.nav_host_fragment, CheckoutFragment())
                .commitAllowingStateLoss()
        }

        Thread.sleep(500)

        onView(withId(R.id.addressInput))
            .check(matches(isDisplayed()))
    }

    @Test
    fun testPhoneInputFieldPresent() {
        activityScenario = ActivityScenario.launch(MainActivity::class.java)

        activityScenario.onActivity { activity ->
            activity.supportFragmentManager.beginTransaction()
                .replace(R.id.nav_host_fragment, CheckoutFragment())
                .commitAllowingStateLoss()
        }

        Thread.sleep(500)

        onView(withId(R.id.phoneInput))
            .check(matches(isDisplayed()))
    }

    @Test
    fun testPaymentMethodGroupPresent() {
        activityScenario = ActivityScenario.launch(MainActivity::class.java)

        activityScenario.onActivity { activity ->
            activity.supportFragmentManager.beginTransaction()
                .replace(R.id.nav_host_fragment, CheckoutFragment())
                .commitAllowingStateLoss()
        }

        Thread.sleep(500)

        onView(withId(R.id.paymentMethodGroup))
            .check(matches(isDisplayed()))
    }

    @Test
    fun testCodRadioButtonPresentAndChecked() {
        activityScenario = ActivityScenario.launch(MainActivity::class.java)

        activityScenario.onActivity { activity ->
            activity.supportFragmentManager.beginTransaction()
                .replace(R.id.nav_host_fragment, CheckoutFragment())
                .commitAllowingStateLoss()
        }

        Thread.sleep(500)

        onView(withId(R.id.codRadioButton))
            .check(matches(isDisplayed()))
    }

    @Test
    fun testBankTransferRadioButtonPresent() {
        activityScenario = ActivityScenario.launch(MainActivity::class.java)

        activityScenario.onActivity { activity ->
            activity.supportFragmentManager.beginTransaction()
                .replace(R.id.nav_host_fragment, CheckoutFragment())
                .commitAllowingStateLoss()
        }

        Thread.sleep(500)

        onView(withId(R.id.bankTransferRadioButton))
            .check(matches(isDisplayed()))
    }

    @Test
    fun testVnpayRadioButtonPresent() {
        activityScenario = ActivityScenario.launch(MainActivity::class.java)

        activityScenario.onActivity { activity ->
            activity.supportFragmentManager.beginTransaction()
                .replace(R.id.nav_host_fragment, CheckoutFragment())
                .commitAllowingStateLoss()
        }

        Thread.sleep(500)

        onView(withId(R.id.vnpayRadioButton))
            .check(matches(isDisplayed()))
    }

    @Test
    fun testPlaceOrderButtonPresent() {
        activityScenario = ActivityScenario.launch(MainActivity::class.java)

        activityScenario.onActivity { activity ->
            activity.supportFragmentManager.beginTransaction()
                .replace(R.id.nav_host_fragment, CheckoutFragment())
                .commitAllowingStateLoss()
        }

        Thread.sleep(500)

        onView(withId(R.id.placeOrderButton))
            .check(matches(isDisplayed()))
    }

    @Test
    fun testTotalTextPresent() {
        activityScenario = ActivityScenario.launch(MainActivity::class.java)

        activityScenario.onActivity { activity ->
            activity.supportFragmentManager.beginTransaction()
                .replace(R.id.nav_host_fragment, CheckoutFragment())
                .commitAllowingStateLoss()
        }

        Thread.sleep(500)

        onView(withId(R.id.totalText))
            .check(matches(isDisplayed()))
    }

    @Test
    fun testProgressBarInitiallyHidden() {
        activityScenario = ActivityScenario.launch(MainActivity::class.java)

        activityScenario.onActivity { activity ->
            activity.supportFragmentManager.beginTransaction()
                .replace(R.id.nav_host_fragment, CheckoutFragment())
                .commitAllowingStateLoss()
        }

        Thread.sleep(500)

        onView(withId(R.id.progressBar))
            .check(matches(isDisplayed()))
    }

    @Test
    fun testFormInputAcceptsText() {
        activityScenario = ActivityScenario.launch(MainActivity::class.java)

        activityScenario.onActivity { activity ->
            activity.supportFragmentManager.beginTransaction()
                .replace(R.id.nav_host_fragment, CheckoutFragment())
                .commitAllowingStateLoss()
        }

        Thread.sleep(500)

        onView(withId(R.id.nameInput))
            .perform(typeText("John Doe"), closeSoftKeyboard())

        onView(withText("John Doe"))
            .check(matches(isDisplayed()))
    }

    @Test
    fun testAddressInputAcceptsText() {
        activityScenario = ActivityScenario.launch(MainActivity::class.java)

        activityScenario.onActivity { activity ->
            activity.supportFragmentManager.beginTransaction()
                .replace(R.id.nav_host_fragment, CheckoutFragment())
                .commitAllowingStateLoss()
        }

        Thread.sleep(500)

        onView(withId(R.id.addressInput))
            .perform(scrollTo(), typeText("123 Main Street, City"), closeSoftKeyboard())

        onView(withText("123 Main Street, City"))
            .check(matches(isDisplayed()))
    }

    @Test
    fun testPhoneInputAcceptsNumbers() {
        activityScenario = ActivityScenario.launch(MainActivity::class.java)

        activityScenario.onActivity { activity ->
            activity.supportFragmentManager.beginTransaction()
                .replace(R.id.nav_host_fragment, CheckoutFragment())
                .commitAllowingStateLoss()
        }

        Thread.sleep(500)

        onView(withId(R.id.phoneInput))
            .perform(typeText("1234567890"), closeSoftKeyboard())

        onView(withText("1234567890"))
            .check(matches(isDisplayed()))
    }
}
