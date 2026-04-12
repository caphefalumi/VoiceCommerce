# TGDD Android - E-Commerce Mobile Application

<div align="center">

[![Android](https://img.shields.io/badge/Android-Kotlin-3DDC84?logo=android)](https://developer.android.com)
[![Min SDK](https://img.shields.io/badge/Min%20SDK-24-3DDC84)]()
[![Target SDK](https://img.shields.io/badge/Target%20SDK-35-3DDC84)]()
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

A full-featured Android e-commerce application with voice commerce capabilities, built with modern Android development practices.

</div>

## Overview

TGDD Android is the mobile companion to the TGDD e-commerce platform, featuring:

- **Product Catalog** - Browse, search, and filter products
- **Shopping Cart** - Add to cart, manage quantities
- **Checkout** - Complete orders with payment integration
- **Voice Commerce** - AI-powered voice search and commands
- **User Authentication** - Email and social login
- **Offline Support** - Local caching for offline browsing

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    TGDD Android                              │
├─────────────────────────────────────────────────────────────┤
│                     UI Layer                                │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│  │ Frag-   │ │ View-   │ │ Adap-    │ │ Adap-   │         │
│  │ ments   │ │ Models  │ │ ters    │ │ ters   │         │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘         │
│       │           │           │           │                 │
├───────┴───────────┴───────────┴───────────┴─────────────────┤
│                    Domain Layer                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Repositories                            │   │
│  │  ProductRepository, CartRepository, OrderRepository  │   │
│  └─────────────────────┬───────────────────────────────┘   │
│                        │                                    │
├────────────────────────┴──────────────────────────────────┤
│                     Data Layer                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Remote   │  │  Room    │  │ Firebase │  │ Network  │ │
│  │ (Retrofit│  │ (SQLite) │  │  Auth    │  │Intercepts│ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
└─────���───────────────────────────────────────────────────────┘

                          │
                          ▼
              TGDD Cloudflare API
```

## Tech Stack

| Category | Technology |
|----------|------------|
| Language | Kotlin 1.9 |
| Android | SDK 24-36 |
| UI | XML Layouts, ViewBinding |
| Architecture | MVVM + Clean Architecture |
| DI | Hilt |
| Networking | Retrofit + OkHttp |
| Database | Room |
| Async | Kotlin Coroutines + Flow |
| Navigation | Navigation Component |
| Auth | Firebase Auth |
| Build | Gradle (Kotlin DSL) |

## Getting Started

### Prerequisites

- [Android Studio](https://developer.android.com/studio) Ladybug or later
- [JDK 17](https://adoptium.net/) or later
- [Android SDK](https://developer.android.com/studio#downloads) SDK 35

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd tgdd/android

# Open in Android Studio
# File > Open > Select android/ directory

# Or build from command line
./gradlew assembleDebug
```

### Build Variants

```bash
# Debug build
./gradlew assembleDebug

# Release build
./gradlew assembleRelease
```

## Project Structure

```
android/
├── app/
│   ├── src/main/
│   │   ├── java/com/tgdd/app/
│   │   │   ├── data/
│   │   │   │   ├── model/          # Data models (DTOs)
│   │   │   │   ├── repository/     # Repository implementations
│   │   │   │   ├── remote/          # Retrofit API interfaces
│   │   │   │   ├── local/          # Room database, DAOs
│   │   │   │   ├── network/       # OkHttp interceptors
│   │   │   │   └── auth/          # Firebase auth helper
│   │   │   ├── di/                # Hilt DI modules
│   │   │   ├── ui/                # UI layer
│   │   │   │   ├── auth/           # Authentication screens
│   │   │   │   ├── product/        # Product list/detail
│   │   │   │   ├── cart/           # Shopping cart
│   │   │   │   ├── checkout/        # Checkout flow
│   │   │   │   ├── orders/         # Order history
│   │   │   │   └── adapter/        # RecyclerView adapters
│   │   │   ├── utils/             # Utility classes
│   │   │   ├── util/              # Helper classes
│   │   │   ├── MainActivity.kt
│   │   │   └── MyApplication.kt
│   │   └── res/
│   │       ├── layout/             # XML layouts
│   │       ├── values/            # Strings, colors, themes
│   │       └── navigation/       # Navigation graphs
│   └── build.gradle.kts
├── build.gradle.kts
└── settings.gradle.kts
```

## Features

### Authentication
- Email/password registration and login
- Social sign-in (Google, Facebook)
- Password reset via email
- Email verification

### Product Catalog
- Product listing with pagination
- Product search with debounce
- Category filtering
- Price and rating filters
- Sort by price, rating, newest

### Shopping Cart
- Add/remove products
- Quantity adjustment
- Promo code application
- Stock validation
- Persistent cart (offline)

### Checkout
- Address selection/addition
- Payment method selection
- Order summary
- Order confirmation

### Orders
- Order history
- Order detail view
- Order status tracking

### Voice Commerce
- Voice search products
- Voice commands for filtering
- Voice-guided shopping

### Additional
- Product reviews
- Search history
- Multi-language support (EN/VI)

## Key Files

| File | Purpose |
|------|---------|
| `data/remote/*Api.kt` | Retrofit API definitions |
| `data/repository/*Repository.kt` | Data access with caching |
| `data/local/AppDatabase.kt` | Room database |
| `di/NetworkModule.kt` | Retrofit/OkHttp DI |
| `di/RepositoryModule.kt` | Repository DI |
| `ui/*/ViewModel.kt` | MVVM ViewModels |
| `utils/ValidationUtils.kt` | Input validation |

## API Integration

The app connects to the TGDD API Worker:

```kotlin
// Base URL
https://api-worker.dangduytoan13l.workers.dev/api/
```

### API Endpoints

| Feature | Endpoints |
|---------|-----------|
| Products | GET /products, GET /products/{id} |
| Cart | GET /cart, POST /cart/add |
| Orders | GET /orders, POST /orders/create |
| Auth | POST /auth/login, POST /auth/register |
| Reviews | GET /products/{id}/reviews |

## Caching Strategy

The app implements **offline-first** caching:

1. **Read**: Check Room cache → Return if valid → Fetch network → Update cache
2. **Write**: Write to network → On success, update local cache

### Cache Duration
- Products: 1 hour
- Cart: Session-based
- User data: Until logout

## Voice Commands

| Command | Action |
|---------|-------|
| "search [product]" | Search products |
| "filter [category]" | Apply category filter |
| "sort by price" | Sort by price |
| "show [category]" | Filter by category |

## Building

```bash
# Clean build
./gradlew clean assembleDebug

# Run tests
./gradlew test

# Run instrumented tests
./gradlew connectedAndroidTest
```

## Troubleshooting

### Common Issues

1. **Build fails with "SDK not found"**
   - Install Android SDK 35 via SDK Manager

2. **API calls fail**
   - Check internet connection
   - Verify BASE_URL in build.gradle.kts

3. **Firebase Auth not working**
   - Check google-services.json is present
   - Verify SHA-1 fingerprint in Firebase Console

## License

MIT License - see [LICENSE](../LICENSE) for details.

---

<div align="center">

Built with ❤️ using Kotlin and Jetpack

</div>
