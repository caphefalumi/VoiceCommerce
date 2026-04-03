# AI Worker - Voice Commerce Agent

<!-- GENERATED: apps/ai-worker/src | Tue Mar 31 2026 -->

## OVERVIEW

Edge-deployed voice commerce agent on Cloudflare Workers. Handles end-to-end voice shopping: speech-to-text, intent classification via LLM, tool execution via MCP, TTS response. Supports Vietnamese. No SSE/MCP HTTP endpoints — DO communicates with MCP server in-memory for lower latency.

## STRUCTURE

```
src/
├── index.ts      # Hono app, endpoints, voice pipeline (STT→LLM→MCP→TTS)
├── mcp.ts        # MCP server (createCommerceMcpServer), 10 tools
├── intent.ts     # processIntent(), buildSearchResponseText() — frontend action mapping
└── intent.test.ts   # bun:test suite for intent.ts
```

## WHERE TO LOOK

| Task | File |
|------|------|
| Add endpoint | `index.ts` — `app.post('/path', ...)` |
| Add MCP tool | `mcp.ts` — `server.registerTool('name', ...)` |
| Frontend action mapping | `intent.ts` — `processIntent()` |
| Voice pipeline logic | `index.ts` — `/voice-process` handler (lines 163-351) |
| Vietnamese text normalization | `index.ts` — `normalizeProductNames()` |
| Resolve product from ordinal | `mcp.ts` — `resolveProduct()` |

**Pipeline flow** (`/voice-process`):
1. STT via `@cf/openai/whisper-large-v3-turbo` (Vietnamese)
2. `normalizeProductNames()` — fix brand/number/STT typos
3. `generateText()` with Nemotron + MCP tools (in-memory transport)
4. `processIntent()` — map tool results to frontend actions
5. TTS via `@cf/myshell-ai/melotts` (optional)
6. Async log to api-worker `/api/admin/voice-logs`

**MCP tools** (10 total): `searchProducts`, `filterProductsByPrice`, `getProductDetails`, `viewCart`, `addToCart`, `removeFromCart`, `startCheckout`, `confirmCheckout`, `getOrderStatus`, `cancelOrder`, `getFaqAnswer`, `createSupportTicket`

## CONVENTIONS

- TypeScript strict, ES2022, path alias `@/*` not used here
- Structured JSON logging: `{ ts, level, service, event, ...fields }`
- Tool names: PascalCase e.g. `searchProducts`, `startCheckout`
- Vietnamese voice responses: short (1-3 sentences), no markdown/bullets in tool output
- `Env` type must include: `AI`, `VECTORIZE`, `VECTORIZE_FAQ`, `DB`
- `resolveOrdinal()` handles Vietnamese ordinals ("thứ nhất", "cái đầu tiên") for product selection
- Test: `bun test src/intent.test.ts`
