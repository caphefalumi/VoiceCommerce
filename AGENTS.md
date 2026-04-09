<!-- gitnexus:start -->
<!-- GENERATED: init-deep | Tue Mar 31 2026 -->

# TGDD — E-Commerce Platform with Voice Commerce

**Monorepo:** Bun workspace | **Stack:** React 19 + Vite, Hono 4, Cloudflare Workers/Pages, Drizzle ORM, Better Auth

## STRUCTURE

```
tgdd/
├── apps/
│   ├── web/           # React 19 frontend (Cloudflare Pages) — 63 source files
│   ├── api-worker/    # Hono REST API (Cloudflare Worker) — auth, cart, orders, Stripe
│   │   └── migrations/
│   │       └── 004_android_features.sql  # NEW: Android features schema
│   └── ai-worker/     # Voice AI Worker (STT/TTS/LLM orchestration)
├── android/           # Kotlin Android app (Gradle)
├── infra/             # Terraform + Ansible (Cloudflare, Vectorize)
├── .agents/skills/    # Agent skill definitions (Better Auth patterns)
└── stitch_project/    # Web scraping artifacts (NOT production code)
```

## NEW FEATURES (2026-04-08)

### Android App Backend Integration ✅

All Android app features now have full backend support:

1. **Wishlist System** - Save favorite products, sync with server
2. **Product Reviews** - Submit ratings, verified purchases, helpful votes
3. **Address Management** - Multiple addresses, default selection
4. **Promo Codes** - Validate discounts, usage tracking, expiration
5. **Search History** - Save searches, suggestions, autocomplete
6. **Advanced Filtering** - Brand, rating, stock, multiple sort options
7. **Input Validation** - Vietnamese phone, email, address validation

**API Endpoints:** 40+ new endpoints
**Voice Tools:** 6 new MCP tools for voice commerce
**Database:** 7 new tables with proper indexes

See `ANDROID_FEATURES_IMPLEMENTATION.md` for complete documentation.

## TOOLS

| Task | Tool |
|------|------|
| Frontend | `apps/web/src/` |
| Backend API | `apps/api-worker/src/` |
| AI Agent | `apps/ai-worker/src/` |
| Android | `android/app/src/` |
| Infra | `infra/terraform/`, `infra/ansible/` |

## COMMANDS

```bash
bun run dev:web       # Frontend http://localhost:5173
bun run dev:api       # API Worker http://localhost:8787
bun run dev:ai        # AI Worker
bun run build:web     # Build frontend
bun run deploy:all    # Deploy all apps
bun run lint          # oxlint apps/*/src
bun run format        # oxfmt . (auto-commits changes in CI)
```

## CONVENTIONS (THIS PROJECT)

- **Linter:** oxlint (NOT ESLint) — `oxlintrc.json` in `apps/web/`
- **Formatter:** oxfmt (NOT Prettier) — `.oxfmtrc.jsonc` in `apps/web/`
- **Quotes:** Single quotes, semicolons required, 2-space indent, 100 char line width
- **TypeScript:** Strict mode, ES2022, path alias `@/*` → `./src/*`
- **Testing:** Vitest (web), bun:test (workers), JUnit+MockK (Android)
- **Naming:** PascalCase components, lowercase/snake_case utils

## ANTI-PATTERNS (THIS PROJECT)

- NO anti-pattern comments in codebase — clean code, enforced via oxlint rules
- **CI auto-commits** formatting changes (`ci.yml` lines 70-76)
- **Lint errors masked** with `continue-on-error: true` in CI
- 1173-line monolith in `api-worker/src/index.ts` — routes not split

## GOTCHAS

- `spring-backend/` referenced in `apps/web/package.json` but doesn't exist
- `packages/` in workspace config but directory doesn't exist
- Hardcoded API URL in `apps/web/vite.config.ts` proxy config
- MongoDB in `docker-compose.yml` but D1/SQLite in production
- AI worker's `ARCHITECTURE.md` references obsolete Spring Boot backend

## CI/CD PIPELINE

- **5 GitHub workflows:** `ci.yml`, `test.yml`, `release.yml`, `security-scan.yml`, `infra-terraform.yml`
- Artifacts retained **7 days only** — too short for debugging
- Release triggered by `workflow_run` from CI (indirect trigger)

---

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **tgdd** (413 symbols, 786 relationships, 8 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## When Debugging

1. `gitnexus_query({query: "<error or symptom>"})` — find execution flows related to the issue
2. `gitnexus_context({name: "<suspect function>"})` — see all callers, callees, and process participation
3. `READ gitnexus://repo/tgdd/process/{processName}` — trace the full execution flow step by step
4. For regressions: `gitnexus_detect_changes({scope: "compare", base_ref: "main"})` — see what your branch changed

## When Refactoring

- **Renaming**: MUST use `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` first. Review the preview — graph edits are safe, text_search edits need manual review. Then run with `dry_run: false`.
- **Extracting/Splitting**: MUST run `gitnexus_context({name: "target"})` to see all incoming/outgoing refs, then `gitnexus_impact({target: "target", direction: "upstream"})` to find all external callers before moving code.
- After any refactor: run `gitnexus_detect_changes({scope: "all"})` to verify only expected files changed.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Tools Quick Reference

| Tool | When to use | Command |
|------|-------------|---------|
| `query` | Find code by concept | `gitnexus_query({query: "auth validation"})` |
| `context` | 360-degree view of one symbol | `gitnexus_context({name: "validateUser"})` |
| `impact` | Blast radius before editing | `gitnexus_impact({target: "X", direction: "upstream"})` |
| `detect_changes` | Pre-commit scope check | `gitnexus_detect_changes({scope: "staged"})` |
| `rename` | Safe multi-file rename | `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` |
| `cypher` | Custom graph queries | `gitnexus_cypher({query: "MATCH ..."})` |

## Impact Risk Levels

| Depth | Meaning | Action |
|-------|---------|--------|
| d=1 | WILL BREAK — direct callers/importers | MUST update these |
| d=2 | LIKELY AFFECTED — indirect deps | Should test |
| d=3 | MAY NEED TESTING — transitive | Test if critical path |

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/tgdd/context` | Codebase overview, check index freshness |
| `gitnexus://repo/tgdd/clusters` | All functional areas |
| `gitnexus://repo/tgdd/processes` | All execution flows |
| `gitnexus://repo/tgdd/process/{name}` | Step-by-step execution trace |

## Self-Check Before Finishing

Before completing any code modification task, verify:
1. `gitnexus_impact` was run for all modified symbols
2. No HIGH/CRITICAL risk warnings were ignored
3. `gitnexus_detect_changes()` confirms changes match expected scope
4. All d=1 (WILL BREAK) dependents were updated

## Keeping the Index Fresh

After committing code changes, the GitNexus index becomes stale. Re-run analyze to update it:

```bash
npx gitnexus analyze
```

If the index previously included embeddings, preserve them by adding `--embeddings`:

```bash
npx gitnexus analyze --embeddings
```

To check whether embeddings exist, inspect `.gitnexus/meta.json` — the `stats.embeddings` field shows the count (0 means no embeddings). **Running analyze without `--embeddings` will delete any previously generated embeddings.**

> Claude Code users: A PostToolUse hook handles this automatically after `git commit` and `git merge`.

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->