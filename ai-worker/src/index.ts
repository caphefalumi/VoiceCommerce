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

// ── VoiceCommerceAgent ────────────────────────────────────────────────────────
// Extends AIChatAgent — a Cloudflare Durable Object backed by built-in SQLite.
// Every conversation turn is persisted automatically; this.messages always
// reflects the full dialogue history, enabling slot filling and multi-turn
// context handling (e.g. "Add the second one" resolves from prior search).

export class VoiceCommerceAgent extends AIChatAgent<Env> {
  // Keep last 50 messages in SQLite per session
  maxPersistedMessages = 50;

  constructor(state: any, env: Env) {
    super(state, env);
    console.log('[VoiceCommerceAgent] constructor called, env:', env ? 'defined' : 'UNDEFINED');
    console.log('[VoiceCommerceAgent] env keys:', env ? Object.keys(env).join(', ') : 'none');
  }

  // We no longer use WebSockets, so we'll handle requests via direct DO calls or public methods.
  // The state is still persisted in this.messages (SQLite).


  async onChatMessage(
    _onFinish: Parameters<AIChatAgent['onChatMessage']>[0],
    _options?: Parameters<AIChatAgent['onChatMessage']>[1]
  ) {
    // This is the legacy callback - delegate to our new method
    return this.generateWithMcp((this as any).messages);
  }

  // Dedicated method that processVoice can call to generate responses with MCP tools
  async generateWithMcp(messages: any[]): Promise<any> {
    console.log('>>> generateWithMcp START');
    const logs = (globalThis as any).__voiceLogs || [];
    const log = (...args: any[]) => {
      const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
      logs.push(msg);
      console.log('    ' + msg);
    };
    
    try {
      const env = (this as any).env as Env;
      log('generateWithMcp: env.VECTORIZE:', !!env?.VECTORIZE);
      
      const workersai = createWorkersAI({ binding: env.AI as any });

      const systemPrompt = `You are TGDD AI — the intelligent voice assistant for Thế Giới Di Động (TGDD), Vietnam's largest electronics retailer.

You communicate mainly in Vietnamese. You are friendly, concise, and helpful.

## Your capabilities (tools)
You have access to a set of specialized tools via MCP. Use them for all commerce-related tasks:
- Product search and filtering by price.
- Side-by-side product comparison.
- Adding or removing items from the cart.
- Starting the checkout process.
- Checking order status.
- Answering FAQs about store policies.
- Creating support tickets.

## Rules
- Always respond in Vietnamese unless the user writes in English.
- Be brief (1-3 sentences max in response text).
- Always call a tool for commerce actions — never fabricate data.
- For ambiguous requests, ask a clarifying question.`;

      // Initialize MCP - import modules first
      const { createCommerceMcpServer } = await import('./mcp');
      const { createMCPClient } = await import('@ai-sdk/mcp');
      const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js');
      
      // Create linked transports for in-memory communication
      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

      // Create and connect MCP server with env bindings
      const mcpServer = createCommerceMcpServer({
        AI: env.AI,
        VECTORIZE: env.VECTORIZE,
        VECTORIZE_FAQ: env.VECTORIZE_FAQ,
        DB: env.DB
      });
      await mcpServer.connect(serverTransport);

      // Create MCP client
      const mcpClient = await createMCPClient({ transport: clientTransport as any });
      const mcpTools = await mcpClient.tools();
      log('generateWithMcp: MCP tools loaded:', Object.keys(mcpTools).join(', '));

      // Generate text with MCP tools
      const result = await generateText({
        model: workersai('@cf/meta/llama-3.3-70b-instruct-fp8-fast') as any,
        system: systemPrompt,
        messages: messages as any,
        tools: mcpTools as any
      });
      
      log('generateWithMcp: result text:', result.text?.slice(0, 100));
      return result;
    } catch (err: any) {
      log('generateWithMcp ERROR:', err.message);
      throw err;
    }
  }

  // Public method for the HTTP worker to call
  async processVoice(audioBase64?: string, text?: string, userId?: string) {
    console.log('>>> processVoice START');
    const logs = (globalThis as any).__voiceLogs || [];
    const log = (...args: any[]) => {
      const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
      logs.push(msg);
      console.log('    ' + msg);
    };
    
    log('processVoice: START');
    console.log('>>> env:', (this as any).env);
    
    let transcribedText = text || '';
    
    // 1. STT
    if (!transcribedText && audioBase64) {
      const stt = await ((this as any).env.AI as any).run('@cf/openai/whisper-large-v3-turbo', {
        audio: audioBase64, language: 'vi',
        initial_prompt: 'Vietnamese electronics store. Product names in English: iPhone, Samsung Galaxy, OPPO, Xiaomi, MacBook, Dell.'
      });
      transcribedText = normalizeProductNames(stt.text || '');
    }

    if (!transcribedText.trim()) return { response_text: 'Xin lỗi, tôi không nghe rõ.' };

    // 2. Add user message to state
    const userMsg = { id: crypto.randomUUID(), role: 'user', content: transcribedText };
    if (userId) userMsg.content = `[User ID: ${userId}] ${userMsg.content}`;
    (this as any).messages.push(userMsg);

    // 3. Generate response via MCP tools
    const result = await this.generateWithMcp((this as any).messages);
    
    // 4. Add assistant message to state
    const assistantMsg = { id: crypto.randomUUID(), role: 'assistant', content: result.text };
    (this as any).messages.push(assistantMsg);

    // 5. Detect high-level action for frontend UI from tool results
    let action: any = null;
    if (result.toolResults) {
      for (const tr of result.toolResults) {
        if (tr.toolName === 'startCheckout') action = { type: 'checkout' };
        else if (tr.toolName === 'searchProducts') action = { type: 'search', query: tr.args.query };
        else if (tr.toolName === 'addToCart' && tr.result.success) action = { type: 'add_to_cart', payload: tr.result };
        else if (tr.toolName === 'removeFromCart' && tr.result.success) action = { type: 'remove_from_cart' };
      }
    }

    // 6. TTS
    let audioOut = null;
    try {
      const tts = await ((this as any).env.AI as any).run('@cf/myshell-ai/melotts', { 
        prompt: result.text?.slice(0, 500) || '', 
        lang: 'vi'
      });
      audioOut = (tts as any).audio || tts;
    } catch (err) {
      console.error('TTS Failed', err);
    }

    return {
      transcribed_text: transcribedText,
      response_text: result.text,
      audio_base64: audioOut,
      action
    };
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
// The VoiceCommerceAgent DO can ONLY be reached via routeAgentRequest (PartyKit
// headers). For this synchronous HTTP pipeline we use Workers AI directly.
app.post('/voice-process', async (c) => {
  try {
    const { text: inputText, audio_base64, session_id } = await c.req.json();
    
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
        userText = stt.text || '';
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
    
    const systemPrompt = `You are TGDD AI — the intelligent voice assistant for Thế Giới Di Động (TGDD), Vietnam's largest electronics retailer.
You communicate mainly in Vietnamese. Be brief.`;
    
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
    
    // TTS: Generate audio from response
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
    
    return c.json({
      transcribed_text: userText,
      response_text: responseText,
      audio_base64: audioBase64,
      tool_results: result.toolResults,
      session_id: session_id || 'default'
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ── Cloudflare Agents SDK routing ─────────────────────────────────────────────
// This routes WebSocket and HTTP streaming requests to the VoiceCommerceAgent DO.
// Path: /agents/VoiceCommerceAgent/:id/*
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Fall back to Hono for REST endpoints (STT, TTS, embed, voice-process, health)
    return app.fetch(request, env, ctx);
  },
};

// Export the Durable Object class so Wrangler can register it
export { VoiceCommerceAgent as default_VoiceCommerceAgent };
