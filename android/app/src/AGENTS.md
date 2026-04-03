# Android App Source

Native Android e-commerce client. Talks to the same API Worker as the web app.

## STRUCTURE

```
src/
├── main/java/com/tgdd/app/
│   ├── MainActivity.kt
│   ├── MyApplication.kt
│   ├── data/
│   │   ├── local/         # Room DB, DAOs, entities
│   │   ├── model/         # DTOs (ProductDto, CartItemDto, etc.)
│   │   ├── network/      # Interceptors, AuthEvents, NetworkMonitor
│   │   ├── remote/       # Retrofit APIs (ProductApi, CartApi, etc.)
│   │   ├── repository/    # Repositories (ProductRepository, CartRepository, etc.)
│   │   └── crash/        # CrashReporter
│   ├── di/               # Hilt modules (NetworkModule, RepositoryModule, DatabaseModule)
│   └── ui/
│       ├── auth/         # Login, Register, VerifyEmail, ForgotPassword, OAuthCallback
│       ├── cart/         # CartFragment, CartViewModel, SwipeToDeleteCallback
│       ├── category/     # CategoryFragment
│       ├── checkout/     # CheckoutFragment, CheckoutViewModel
│       ├── detail/       # ProductDetailFragment, ProductDetailViewModel
│       ├── help/         # HelpFragment, HelpViewModel
│       ├── orders/       # OrdersFragment, OrdersViewModel, OrdersAdapter
│       ├── product/       # ProductListFragment, ProductListViewModel
│       ├── profile/      # ProfileFragment, AccountSettingsFragment
│       ├── adapter/      # RecyclerView adapters (ProductAdapter, CartAdapter, ReviewAdapter)
│       └── utils/        # ViewExtensions, SnackbarExtensions
├── test/                 # Unit tests (ProductRepositoryTest, CartRepositoryTest)
└── androidTest/          # Instrumentation tests (CartTest, ProductListTest, CheckoutTest)
```

## WHERE TO LOOK

| Task | File/Dir |
|------|----------|
| API calls | `data/remote/` + `data/repository/` |
| Local caching | `data/local/` + Room DAOs |
| DI setup | `di/` |
| Auth flow | `ui/auth/` |
| Product browsing | `ui/product/` + `ui/detail/` |
| Cart/checkout | `ui/cart/` + `ui/checkout/` |

## CONVENTIONS

- Kotlin, Java 17, compileSdk 34
- MVVM: ViewModels + LiveData/StateFlow
- Hilt for DI (kapt for Hilt, KSP for Room)
- Retrofit + OkHttp for networking
- Room for local caching
- MockK for unit tests (`src/test/`)
- Coroutines everywhere
- ViewBinding, no Compose
- BASE_URL: `https://api-worker.dangduytoan13l.workers.dev/api/`
