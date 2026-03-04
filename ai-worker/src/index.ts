/// <reference types="@cloudflare/workers-types" />
import { AIChatAgent } from '@cloudflare/ai-chat';
import { createWorkersAI } from 'workers-ai-provider';
import { generateText, tool } from 'ai';
import { z } from 'zod';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

// ── Types ─────────────────────────────────────────────────────────────────────

type Env = {
  AI: Fetcher;
  VECTORIZE: VectorizeIndex;
  VECTORIZE_FAQ: VectorizeIndex;
  DB: D1Database;
  VoiceCommerceAgent: DurableObjectNamespace;
};

// ── Logging ───────────────────────────────────────────────────────────────────

type LogLevel = 'info' | 'warn' | 'error';
function log(level: LogLevel, event: string, fields: Record<string, unknown> = {}): void {
  const entry = { ts: new Date().toISOString(), level, service: 'ai-worker', event, ...fields };
  level === 'error' ? console.error(JSON.stringify(entry)) : console.log(JSON.stringify(entry));
}

// ── Text utilities ─────────────────────────────────────────────────────────────

function normalizeProductNames(text: string): string {
  if (!text) return text;
  let normalized = text;

  const brandMappings: Record<string, string> = {
    'aiphone': 'iPhone', 'ipon': 'iPhone', 'ipong': 'iPhone', 'iphon': 'iPhone', 'iphone': 'iPhone',
    'ôpô': 'OPPO', 'oppo': 'OPPO', 'sam sung': 'Samsung', 'samsung': 'Samsung',
    'xiomi': 'Xiaomi', 'xiaomi': 'Xiaomi', 'hoa vi': 'Huawei', 'huawei': 'Huawei',
    'vivo': 'Vivo', 'realme': 'Realme', 'nokia': 'Nokia', 'macbook': 'MacBook',
    'mac book': 'MacBook', 'dell': 'Dell', 'hp': 'HP', 'asus': 'ASUS',
    'lenovo': 'Lenovo', 'honor': 'HONOR', 'kidcare': 'Kidcare',
  };

  const modelMappings: Record<string, string> = {
    'mười chín': '19', 'mười tám': '18', 'mười bảy': '17', 'mười sáu': '16',
    'mười lăm': '15', 'mười bốn': '14', 'mười ba': '13', 'mười hai': '12',
    'mười một': '11', 'mười': '10', 'chín': '9', 'tám': '8', 'bảy': '7',
    'sáu': '6', 'năm': '5', 'tư': '4', 'ba': '3', 'hai': '2', 'một': '1',
  };

  const phraseMappings: Record<string, string> = {
    'giảnh hẹn': 'giỏ hàng', 'giánh hẹn': 'giỏ hàng', 'giành hẹn': 'giỏ hàng',
    'dành hẹn': 'giỏ hàng', 'giản hẹn': 'giỏ hàng', 'dỏ hàng': 'giỏ hàng',
    'giỏ hang': 'giỏ hàng', 'gio hang': 'giỏ hàng', 'gỏ hàng': 'giỏ hàng',
  };

  // Sort by length descending so longer patterns (e.g. 'sam sung') match before
  // shorter ones. Use word boundaries to prevent 'iphon' from matching
  // inside 'iPhone' and producing 'iPhonee'.
  const sortedBrands = Object.entries(brandMappings).sort((a, b) => b[0].length - a[0].length);
  for (const [vn, en] of sortedBrands) {
    normalized = normalized.replace(new RegExp('\\b' + vn + '\\b', 'gi'), en);
  }
  for (const [vn, en] of Object.entries(modelMappings)) {
    normalized = normalized.replace(new RegExp('\\b' + vn + '\\b', 'gi'), en);
  }
  for (const [wrong, correct] of Object.entries(phraseMappings)) {
    normalized = normalized.replace(new RegExp(wrong, 'gi'), correct);
  }

  normalized = normalized.replace(/\b(x)\s+(\d+)\b/gi, '$1$2');
  normalized = normalized.replace(/\b(s)\s+(\d+)\b/gi, '$1$2');
  return normalized;
}

async function generateEmbedding(text: string, env: Env): Promise<number[]> {
  try {
    const response = await (env.AI as any).run('@cf/baai/bge-m3', { text: [text] });
    return response.data[0];
  } catch (e) {
    console.error('Embedding error:', e);
    return [];
  }
}



// ── MCP Server Initialization & Transport (Hono) ──────────────────────────────
// The VoiceCommerceAgent uses the MCP server directly in memory.
// There is no need for SSE HTTP endpoints anymore, avoiding extra latency.
const app = new Hono<{ Bindings: Env }>();
app.use('*', cors({ origin: '*' }));

// MCP Endpoints have been removed as DO communicates with the MCP server in-memory.

// Observability
app.use('*', async (c, next) => {
  const start = Date.now();
  const reqId = Math.random().toString(36).slice(2, 10);
  c.header('X-Request-Id', reqId);
  await next();
  const path = new URL(c.req.url).pathname;
  if (path !== '/health') {
    log('info', 'request', { request_id: reqId, method: c.req.method, path, status: c.res.status, latency_ms: Date.now() - start });
  }
});

app.get('/health', (c) => c.json({ status: 'ok', service: 'ai-worker', version: '2.0.0', ts: new Date().toISOString() }));

// ── STT ───────────────────────────────────────────────────────────────────────
app.post('/stt', async (c) => {
  try {
    const { audio_base64 } = await c.req.json();
    if (!audio_base64) return c.json({ error: 'Missing audio_base64' }, 400);
    const response = await (c.env.AI as any).run('@cf/openai/whisper-large-v3-turbo', {
      audio: audio_base64, language: 'vi',
      initial_prompt: 'Vietnamese electronics store. Product names in English: iPhone, Samsung Galaxy, OPPO, Xiaomi, MacBook, Dell.',
    });
    return c.json({ text: normalizeProductNames(response.text || '') });
  } catch (error: any) {
    log('error', 'stt.error', { message: error.message });
    return c.json({ error: error.message }, 500);
  }
});

// ── TTS ───────────────────────────────────────────────────────────────────────
app.post('/tts', async (c) => {
  try {
    const { text, lang } = await c.req.json();
    if (!text) return c.json({ error: 'Missing text' }, 400);
    const response = await (c.env.AI as any).run('@cf/myshell-ai/melotts', { 
      prompt: text,
      lang: lang || 'en'
    });
    const audioBase64 = (response as any).audio || response;
    return c.json({ audio_base64: audioBase64 });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ── Embeddings ────────────────────────────────────────────────────────────────
app.post('/embed', async (c) => {
  try {
    const { text } = await c.req.json();
    if (!text) return c.json({ error: 'Missing text' }, 400);
    const response = await (c.env.AI as any).run('@cf/baai/bge-m3', { text: [text] });
    return c.json({ embedding: response.data[0] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ── Legacy voice-process (backward compat with frontend/Spring) ─────────────
// Pipeline: STT → Workers AI LLM (intent + slots) → tool execution → TTS
const API_WORKER_BASE = 'https://api-worker.dangduytoan13l.workers.dev';

app.post('/voice-process', async (c) => {
  try {
    const { text: inputText, audio_base64, session_id, context } = await c.req.json();
    const userId: string | null = context?.user_id || null;
    const lastProducts: Array<{id: string; name: string; price: number; index: number}> = context?.last_products || [];
    
    const env = c.env;
    const workersai = createWorkersAI({ binding: env.AI as any });
    
    let userText = inputText || '';
    
    // STT: if audio provided, transcribe it
    if (!userText && audio_base64) {
      try {
        const stt = await (env.AI as any).run('@cf/openai/whisper-large-v3-turbo', {
          audio: audio_base64,
          language: 'vi',
          initial_prompt: 'Vietnamese electronics store. Product names: iPhone, Samsung, OPPO, Xiaomi, MacBook, Dell.'
        });
        userText = normalizeProductNames(stt.text || '');
      } catch (sttErr) {
        console.error('STT error:', sttErr);
      }
    }
    
    if (!userText.trim()) {
      return c.json({ response_text: 'Xin lỗi, tôi không nghe rõ.' });
    }
    
    const { createCommerceMcpServer } = await import('./mcp');
    const { createMCPClient } = await import('@ai-sdk/mcp');
    const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js');
    
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    
    const mcpServer = createCommerceMcpServer({
      AI: env.AI,
      VECTORIZE: env.VECTORIZE,
      VECTORIZE_FAQ: env.VECTORIZE_FAQ,
      DB: env.DB
    });
    await mcpServer.connect(serverTransport);
    
    const mcpClient = await createMCPClient({ transport: clientTransport as any });
    const mcpTools = await mcpClient.tools();
    
    // Build product context for the LLM
    let productContext = '';
    if (lastProducts.length > 0) {
      productContext = `\n## Sản phẩm đã hiển thị trước đó:\n${lastProducts.map(p => `${p.index}. ${p.name} - ${p.price?.toLocaleString('vi-VN') || 'N/A'} VND (ID: ${p.id})`).join('\n')}\n\nKhi người dùng nói "thêm sản phẩm thứ X" hoặc "sản phẩm thứ X", hãy sử dụng index để xác định sản phẩm.`;
    }
    
    const systemPrompt = `You are TGDD AI — the intelligent voice assistant for Thế Giới Di Động (TGDD), Vietnam's largest electronics retailer.
You communicate mainly in Vietnamese. Be brief (1-3 sentences). Always call a tool for commerce actions— never fabricate data.${productContext}`;
    
    const messages = [{ role: 'user', content: userText }];
    
    const result = await generateText({
      model: workersai('@cf/meta/llama-3.3-70b-instruct-fp8-fast') as any,
      system: systemPrompt,
      messages: messages as any,
      tools: mcpTools as any
    });
    
    let responseText = result.text;
    if (!responseText && (result as any).toolResults?.length) {
      const toolResults = (result as any).toolResults;
      const lastTool = toolResults[toolResults.length - 1];
      if (lastTool.output?.content?.[0]?.text) {
        try {
          const parsed = JSON.parse(lastTool.output.content[0].text);
          responseText = parsed.message || parsed.answer || '';
        } catch {
          responseText = lastTool.output.content[0].text;
        }
      }
    }
    
    // TTS: Generate audio from response (Vietnamese via melotts)
    let audioBase64 = null;
    if (responseText) {
      try {
        const tts = await (env.AI as any).run('@cf/myshell-ai/melotts', {
          prompt: responseText.slice(0, 500),
          lang: 'en'
        });
        audioBase64 = (tts as any).audio || tts;
      } catch (ttsErr) {
        console.error('TTS error:', ttsErr);
      }
    }

    // Detect intent from tool calls for logging
    let intent: string | null = null;
    if ((result as any).toolCalls?.length) {
      intent = (result as any).toolCalls[0]?.toolName || null;
    } else if (result.toolResults?.length) {
      intent = (result.toolResults[0] as any)?.toolName || null;
    }

    // Async log voice interaction to api-worker (fire-and-forget, best-effort)
    const ctx = (c as any).executionCtx;
    const logFetch = fetch(`${API_WORKER_BASE}/api/admin/voice-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: session_id || 'default',
        user_id: userId,
        user_text: userText,
        response_text: responseText || '',
        intent,
      }),
    }).catch(() => {}); // ignore errors — logging is best-effort
    if (ctx?.waitUntil) ctx.waitUntil(logFetch);
    
    // Detect action for frontend (cart, search, checkout)
    let action: any = null;
    if (result.toolResults?.length) {
      for (const tr of result.toolResults as any[]) {
        try {
          const parsed = typeof tr.result === 'string' ? JSON.parse(tr.result) : tr.result;
          if (tr.toolName === 'startCheckout') action = { type: 'checkout' };
          else if (tr.toolName === 'searchProducts') action = { type: 'search', query: messages[0].content };
          else if (tr.toolName === 'addToCart' && parsed?.success) action = { type: 'add_to_cart', payload: parsed };
          else if (tr.toolName === 'removeFromCart' && parsed?.success) action = { type: 'remove_from_cart' };
        } catch {}
      }
    }

    return c.json({
      transcribed_text: userText,
      response_text: responseText,
      audio_base64: null,
      tool_results: result.toolResults,
      action,
      session_id: session_id || 'default'
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Cloudflare Workers entry point
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx);
  },
};
