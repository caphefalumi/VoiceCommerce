# apps/web/src — React 19 Frontend

<!-- GENERATED: init-deep | Tue Mar 31 2026 -->

## OVERVIEW

React 19 frontend with TanStack Router, Zustand state, Tailwind CSS. 63 source files across components, routes, lib, store.

## STRUCTURE

- `components/` — VoiceAssistant, Header, ProductCard, BannerCarousel, cart/, product/, ui/
- `routes/` — File-based routing via TanStack Router (index, cart, checkout, product.$id, admin, orders, account/, oauth/)
- `lib/` — Utilities, API client, auth-client, d1-client, utils, filter
- `store/` — Zustand stores (cart.ts, auth.ts)
- `models/` — TypeScript data models (User, Product, Role, Vehicle, CellPhone*)
- `types/` — TypeScript type definitions
- `test/` — Vitest setup with @testing-library/react
- `constants/` — Static data (categories)

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Entry point | `main.tsx` → `App.tsx` |
| Route tree | `routeTree.gen.ts` (auto-generated, do not edit) |
| Routes | `routes/*.tsx` — file name = URL path |
| State management | `store/cart.ts`, `store/auth.ts` |
| API calls | `lib/api.ts`, `lib/auth-client.ts` |
| Voice commerce | `VoiceAssistant.tsx` |
| Product pages | `routes/product.$id.tsx`, `routes/products.tsx` |
| Checkout flow | `routes/checkout.tsx`, `routes/checkout-success.tsx` |

## CONVENTIONS

- Path alias: `@/*` → `./src/*` (from `tsconfig.json`)
- React 19 features (use() hook, startTransition)
- Component naming: PascalCase files and exports
- Utility files: lowercase/snake_case
- State: Zustand with `create()` pattern
- Styling: Tailwind CSS utility classes
- Testing: Vitest + @testing-library/react with jsdom

## ANTI-PATTERNS

- Do NOT edit `routeTree.gen.ts` — regenerate via `bunx tanstack-router generate`
- Do NOT mix routing patterns — follow TanStack Router file conventions
- Orphaned models in `models/` (Vehicle, CellPhone*) may be unused — verify before editing
