# API Worker — Hono REST API

**Stack:** Hono 4, Cloudflare Worker, Better Auth, Drizzle ORM, Stripe

## OVERVIEW

Single-file monolith in `index.ts` (1173 lines). Handles auth, products, users, cart, orders, payments, admin, and cron routes. Production database is D1 (SQLite); dev uses local SQLite.

## STRUCTURE

```
src/
├── index.ts              # All routes + handlers (monolith)
├── lib/auth.ts           # Better Auth server config + OAuth/TOTP/email plugins
├── db/index.ts           # Drizzle client, migrations
├── db/auth-schema.ts      # User/session/verification tables
├── middleware/auth.ts     # JWT validation middleware
├── integration.test.ts    # Integration tests
└── helpers.test.ts        # Unit tests
```

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Auth logic | `lib/auth.ts` — Better Auth config, Google OAuth, TOTP, email verification |
| Route handlers | `index.ts` — inline routes for products, users, auth, cart, orders, stripe, admin, cron |
| Database schema | `db/auth-schema.ts` |
| JWT middleware | `middleware/auth.ts` — validates session, sets `c.set('user', ...)` |
| Stripe integration | `index.ts` — webhooks + checkout sessions |

## CONVENTIONS

- Bindings: `Env` interface with `DB`, auth secrets, `STRIPE_SECRET`, `MAILERSEND_TOKEN`
- Variables: `c.set('user', user)` after auth middleware
- Context access: `c.get('user')` in handlers
- Error handling: Return `c.json({ error: '...' }, 400/401/500)`
- Auth guards: Check `c.get('user')` at route level

## ANTI-PATTERNS

- **No route splitting** — all handlers live in `index.ts`; extracting routes to separate files would reduce risk of merge conflicts
- **No middleware separation** — auth checks duplicated across handlers instead of centralized middleware
- **Hardcoded Stripe webhook secret** — should use env binding
- **No request validation** — handlers trust raw body/query params
