/// <reference types="@cloudflare/workers-types" />
import { createWorkersAI } from 'workers-ai-provider';
import { generateText, tool } from 'ai';
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

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return buffer;
}

function buildMp3BinaryResponse(audioBase64: string): Response {
  const audioBuffer = base64ToArrayBuffer(audioBase64);
  return new Response(audioBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-store',
      'X-Audio-Format': 'mp3',
    },
  });
}

function shouldReturnBinary(c: any, responseFormat?: string): boolean {
  const acceptHeader = c.req.header('accept')?.toLowerCase() || '';
  const queryFormat = c.req.query('response_format')?.toLowerCase() || '';
  const headerFormat = c.req.header('x-response-format')?.toLowerCase() || '';
  const desiredFormat = (responseFormat || queryFormat || headerFormat).toLowerCase();

  if (desiredFormat === 'json') return false;
  if (desiredFormat === 'binary' || desiredFormat === 'mp3' || desiredFormat === 'audio') return true;

  if (acceptHeader.includes('application/json') && !acceptHeader.includes('audio/')) return false;
  if (acceptHeader.includes('audio/mpeg') || acceptHeader.includes('audio/*')) return true;
  if (acceptHeader.includes('*/*') || !acceptHeader) return true;

  return false;
}

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
    'oppo': 'OPPO', 'sam sung': 'Samsung', 'samsung': 'Samsung',
    'xiomi': 'Xiaomi', 'xiaomi': 'Xiaomi', 'huawei': 'Huawei',
    'vivo': 'Vivo', 'realme': 'Realme', 'nokia': 'Nokia', 'macbook': 'MacBook',
    'mac book': 'MacBook', 'dell': 'Dell', 'hp': 'HP', 'asus': 'ASUS',
    'lenovo': 'Lenovo', 'honor': 'HONOR', 'kidcare': 'Kidcare',
  };

  const modelMappings: Record<string, string> = {
    'nineteen': '19', 'eighteen': '18', 'seventeen': '17', 'sixteen': '16',
    'fifteen': '15', 'fourteen': '14', 'thirteen': '13', 'twelve': '12',
    'eleven': '11', 'ten': '10', 'nine': '9', 'eight': '8', 'seven': '7',
    'six': '6', 'five': '5', 'four': '4', 'three': '3', 'two': '2', 'one': '1',
  };

  const phraseMappings: Record<string, string> = {
    'my cart': 'cart', 'shopping cart': 'cart',
    // Selection/ordinal phrases - normalize to "product number X" pattern
    'the first one': 'product number 1', 'first one': 'product number 1', 'first': 'product number 1',
    'the second one': 'product number 2', 'second one': 'product number 2', 'second': 'product number 2',
    'the third one': 'product number 3', 'third one': 'product number 3', 'third': 'product number 3',
    'the fourth one': 'product number 4', 'fourth one': 'product number 4', 'fourth': 'product number 4',
    'the fifth one': 'product number 5', 'fifth one': 'product number 5', 'fifth': 'product number 5',
    'the last one': 'last product', 'last one': 'last product',
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
    if (!audio_base64) return c.json({ error: 'Missing audio data (audio_base64)' }, 400);
    const response = await (c.env.AI as any).run('@cf/openai/whisper-large-v3-turbo', {
      audio: audio_base64, language: 'en',
      initial_prompt: 'Electronics store. Product names include: iPhone, Samsung Galaxy, OPPO, Xiaomi, MacBook, Dell.',
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
    const { text, lang, response_format } = await c.req.json();
    if (!text) return c.json({ error: 'Missing text content' }, 400);
    const response = await (c.env.AI as any).run('@cf/deepgram/aura-2-en', {
      text,
      speaker: 'luna',
      encoding: 'mp3',
      container: 'none'
    });
    const audioBase64 = (response as any).audio_content || null;

    const wantsBinary = shouldReturnBinary(c, response_format);

    if (audioBase64 && wantsBinary) return buildMp3BinaryResponse(audioBase64);

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

// ── Chat endpoint for text-based chatbot ────────────────────────────────────
app.post('/chat', async (c) => {
  try {
    const { text, user_id, history } = await c.req.json();
    
    if (!text?.trim()) {
      return c.json({ error: 'Missing text' }, 400);
    }

    const env = c.env;
    
    // Build conversation history for context
    const conversationHistory = (history || []).map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));

    // Initialize MCP server and client
    const { createCommerceMcpServer } = await import('./mcp');
    const { createMCPClient } = await import('@ai-sdk/mcp');
    const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js');
    
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    
    const mcpServer = createCommerceMcpServer({
      AI: env.AI,
      VECTORIZE: env.VECTORIZE,
      VECTORIZE_FAQ: env.VECTORIZE_FAQ,
      DB: env.DB
    }, [], user_id || '');
    await mcpServer.connect(serverTransport);
    
    const mcpClient = await createMCPClient({ transport: clientTransport as any });
    const mcpTools = await mcpClient.tools();

    const workersai = createWorkersAI({ binding: env.AI as any });

    const userIdValue = user_id || '';
    const ctxJson = JSON.stringify({ current_user_id: userIdValue });
    const systemPrompt = `You are TGDD AI — the intelligent assistant for TGDD, Vietnam's largest electronics retail system.
You communicate in English. Keep responses helpful and conversational.
Always call tools for shopping actions — never create fake data.
When users ask about products, orders, or need shopping help, use the available tools to provide accurate information.

IMPORTANT: When calling cart-related tools (viewCart, addToCart, removeFromCart), you MUST pass the userId parameter.
Get the current user ID from this JSON data and pass it to the userId parameter: ${ctxJson}
${conversationHistory.length > 0 ? `\n\n## Recent conversation:\n${conversationHistory.map((h: any) => `${h.role === 'user' ? 'User' : 'AI'}: ${h.content}`).join('\n')}` : ''}`;

    const messages = [{ role: 'user', content: text }];

    const result = await generateText({
      model: workersai('@cf/nvidia/nemotron-3-120b-a12b') as any,
      system: systemPrompt,
      messages: messages as any,
      tools: mcpTools as any,
    });

    let responseText = result.text;
    
    // Detect action for frontend (cart, search, checkout)
    const { processIntent, buildSearchResponseText } = await import('./intent');
    const intentResult = processIntent(result.toolResults || [], text);
    let action = intentResult.action;
    const searchResults = intentResult.searchResults;

    if (action?.type === 'search' || action?.type === 'filter') {
      responseText = buildSearchResponseText(searchResults, text);
    }
    
    // Extract meaningful response from tool results if no text was generated
    if (!responseText && (result as any).toolResults?.length) {
      const toolResults = (result as any).toolResults;
      const lastTool = toolResults[toolResults.length - 1];
      if (lastTool.output?.content?.[0]?.text) {
        try {
          const parsed = JSON.parse(lastTool.output.content[0].text);
          responseText = parsed.message || parsed.answer || lastTool.output.content[0].text;
        } catch {
          responseText = lastTool.output.content[0].text;
        }
      }
    }
    
    // Fallback if still no response
    if (!responseText) {
      responseText = 'I have processed your request.';
    }

    // Detect intent from tool calls for logging
    let intent: string | null = null;
    if ((result as any).toolCalls?.length) {
      intent = (result as any).toolCalls[0]?.toolName || null;
    } else if (result.toolResults?.length) {
      intent = (result.toolResults[0] as any)?.toolName || null;
    }

    return c.json({
      response_text: responseText,
      intent: intent,
      tool_results: result.toolResults,
      action,
      search_results: searchResults,
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ── New voice/process endpoint for Android ──────────────────────────────────
app.post('/voice/process', async (c) => {
  try {
    const { audio_base64, session_id, user_id, history, response_format, context } = await c.req.json();
    
    if (!audio_base64) {
      return c.json({ error: 'Missing audio_base64' }, 400);
    }

    const env = c.env;
    
    // STT: Transcribe audio
    let userText = '';
    try {
      const stt = await (env.AI as any).run('@cf/openai/whisper-large-v3-turbo', {
        audio: audio_base64,
        language: 'en',
        initial_prompt: 'Electronics store. Product names: iPhone, Samsung, OPPO, Xiaomi, MacBook, Dell.'
      });
      userText = normalizeProductNames(stt.text || '');
    } catch (sttErr) {
      console.error('STT error:', sttErr);
      return c.json({ error: 'Failed to transcribe audio' }, 500);
    }

    if (!userText.trim()) {
      return c.json({ 
        text: 'Sorry, I could not hear you clearly.',
        audio_base64: null,
        intent: null,
        navigate_to: null
      });
    }

    // Build conversation history for context
    const conversationHistory = (history || []).map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));

    // Extract search results from context
    const lastSearchResults: Array<{id: string; name: string; price: number; index: number}> = context?.last_search_results || [];

    // Initialize MCP server and client
    const { createCommerceMcpServer } = await import('./mcp');
    const { createMCPClient } = await import('@ai-sdk/mcp');
    const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js');
    
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    
    const mcpServer = createCommerceMcpServer({
      AI: env.AI,
      VECTORIZE: env.VECTORIZE,
      VECTORIZE_FAQ: env.VECTORIZE_FAQ,
      DB: env.DB
    }, lastSearchResults, user_id || '');
    await mcpServer.connect(serverTransport);
    
    const mcpClient = await createMCPClient({ transport: clientTransport as any });
    const mcpTools = await mcpClient.tools();

    const workersai = createWorkersAI({ binding: env.AI as any });

    // Build product context for the LLM
    let productContext = '';
    if (lastSearchResults.length > 0) {
      productContext = `

## Previously displayed products:
${lastSearchResults.map((p: any) => `${p.index}. ${p.name} - ${p.price?.toLocaleString('en-US') || 'N/A'} VND (ID: ${p.id})`).join('\n')}
 
IMPORTANT:
- When user says "add product number X", "product number X", "the Xth one", "the first one" (X=1), "the second one" (X=2), "the last one", ALWAYS use the corresponding productId from the list above (ID: ${lastSearchResults.map((p: any) => p.id).join(' or ')}).
- "the first one" = product number 1 (index 1)
- "the second one" = product number 2 (index 2)  
- "the third one" = product number 3 (index 3)
- "the last one" = last product in the list
- NEVER skip or create fake productId - always use real ID from the list above.
- If user asks about specifications, configuration, features of a product (e.g., "what are iPhone 17 specs?", "how much RAM?", "battery capacity?"), call getProductDetails with productName as the product name to get specs info.
- If user only says "product number X" or product name WITHOUT an action verb (like "add", "buy", "remove"), call getProductDetails with corresponding productId to display info, then ask user what they want to do next.`;
    }

    const systemPrompt = `You are TGDD AI — the intelligent voice assistant for TGDD.
You communicate in English. Keep responses brief (1-3 sentences). 
Always call tools for shopping actions — never create fake data.
When users want to checkout or place an order, confirm and guide them to the checkout page.
${conversationHistory.length > 0 ? `\n\n## Recent conversation:\n${conversationHistory.map((h: any) => `${h.role === 'user' ? 'User' : 'AI'}: ${h.content}`).join('\n')}` : ''}${productContext}`;

    const messages = [{ role: 'user', content: userText }];

    const result = await generateText({
      model: workersai('@cf/nvidia/nemotron-3-120b-a12b') as any,
      system: systemPrompt,
      messages: messages as any,
      tools: mcpTools as any,
    });

    let responseText = result.text;
    
    // Extract meaningful response from tool results if no text was generated
    if (!responseText && (result as any).toolResults?.length) {
      const toolResults = (result as any).toolResults;
      const lastTool = toolResults[toolResults.length - 1];
      if (lastTool.output?.content?.[0]?.text) {
        try {
          const parsed = JSON.parse(lastTool.output.content[0].text);
          const hasProductDetailsPayload = parsed?.action === 'product_details' && parsed?.product;
          if (hasProductDetailsPayload) {
            try {
              const synthesis = await generateText({
                model: workersai('@cf/nvidia/nemotron-3-120b-a12b') as any,
                system: 'You are a TGDD product consultant. Summarize naturally and briefly in 2-3 sentences in pure English, without foreign words or strange characters. Only select truly useful points from specs data, avoid repetition, avoid mechanical listing, skip low-value fields.',
                messages: [{
                  role: 'user',
                  content: `Product data: ${JSON.stringify(parsed.product)}. Provide brief advice and end with an appropriate follow-up question (compare or add to cart).`,
                }] as any,
              });
              responseText = synthesis.text?.trim() || parsed.message || '';
            } catch {
              responseText = parsed.message || '';
            }
          } else {
            responseText = parsed.message || parsed.answer || '';
          }
        } catch {
          responseText = lastTool.output.content[0].text;
        }
      }
    }
    
    // Fallback if still no response
    if (!responseText) {
      responseText = 'I have processed your request.';
    }

    // TTS: Generate audio response
    let audioBase64 = null;
    try {
      const tts = await (env.AI as any).run('@cf/deepgram/aura-2-en', {
        text: responseText.slice(0, 500),
        speaker: 'luna',
        encoding: 'mp3',
        container: 'none'
      });
      audioBase64 = (tts as any).audio_content || null;
    } catch (ttsErr) {
      console.error('TTS error:', ttsErr);
    }

    // Detect intent and navigation
    let intent: string | null = null;
    let navigateTo: string | null = null;

    if ((result as any).toolCalls?.length) {
      intent = (result as any).toolCalls[0]?.toolName || null;
    } else if (result.toolResults?.length) {
      intent = (result.toolResults[0] as any)?.toolName || null;
    }

    // Detect action for frontend (cart, search, checkout)
    const { processIntent, buildSearchResponseText } = await import('./intent');
    const intentResult = processIntent(result.toolResults || [], userText);
    let action = intentResult.action;
    const searchResults = intentResult.searchResults;
    const toolResults = result.toolResults || [];

    if (action?.type === 'search' || action?.type === 'filter') {
      responseText = buildSearchResponseText(searchResults, userText);
    }

    const looksLikeAddToCart = /(add|put).*(cart|basket)|(cart|basket).*(add|put)/i.test(userText);
    if (looksLikeAddToCart && toolResults.length === 0 && !action) {
      action = {
        type: 'add_to_cart_failed',
        payload: { success: false, message: 'I cannot add to cart right now. Please try again.' },
      };
    }

    if (action?.type === 'add_to_cart' && (!action.payload?.success || !action.payload?.product)) {
      action.type = 'add_to_cart_failed';
    }

    // Check if user wants to checkout
    const checkoutKeywords = /(checkout|place order|buy|order|payment)/i;
    if (checkoutKeywords.test(userText) || intent === 'checkout' || intent === 'createOrder') {
      navigateTo = 'checkout';
    }

    // Log to api-worker (fire-and-forget)
    const ctx = (c as any).executionCtx;
    const logFetch = fetch(`${API_WORKER_BASE}/api/admin/voice-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: session_id || 'default',
        user_id: user_id,
        user_text: userText,
        response_text: responseText,
        intent,
      }),
    }).catch(() => {});
    if (ctx?.waitUntil) ctx.waitUntil(logFetch);

    const wantsBinary = shouldReturnBinary(c, response_format);
    if (audioBase64 && wantsBinary) return buildMp3BinaryResponse(audioBase64);

    return c.json({
      transcribed_text: userText,
      text: responseText,
      audio_base64: audioBase64,
      intent: intent,
      navigate_to: navigateTo,
      tool_results: result.toolResults,
      action,
      search_results: searchResults,
      session_id: session_id || 'default'
    });
  } catch (error: any) {
    console.error('Voice process error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/voice-process', async (c) => {
  try {
    const { text: inputText, audio_base64, session_id, context, response_format } = await c.req.json();
    const userId: string | null = context?.user_id || null;
    const lastSearchResults: Array<{id: string; name: string; price: number; index: number}> = context?.last_search_results || [];
    const conversationHistory: Array<{role: 'user' | 'assistant'; content: string}> = context?.conversation_history || [];
    
    const env = c.env;
    const workersai = createWorkersAI({ binding: env.AI as any });
    
    let userText = inputText || '';
    
    // STT: if audio provided, transcribe it
    if (!userText && audio_base64) {
      try {
        const stt = await (env.AI as any).run('@cf/openai/whisper-large-v3-turbo', {
          audio: audio_base64,
          language: 'en',
          initial_prompt: 'Electronics store. Product names: iPhone, Samsung, OPPO, Xiaomi, MacBook, Dell.'
        });
        userText = normalizeProductNames(stt.text || '');
      } catch (sttErr) {
        console.error('STT error:', sttErr);
      }
    }
    
    if (!userText.trim()) {
      return c.json({ response_text: 'Sorry, I could not hear you clearly.' });
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
    }, lastSearchResults, userId || '');
    await mcpServer.connect(serverTransport);
    
    const mcpClient = await createMCPClient({ transport: clientTransport as any });
    const mcpTools = await mcpClient.tools();
    
    // Build product context for the LLM
    let productContext = '';
    if (lastSearchResults.length > 0) {
      productContext = `
## Previously displayed products:
${lastSearchResults.map((p: any) => `${p.index}. ${p.name} - ${p.price?.toLocaleString('en-US') || 'N/A'} VND (ID: ${p.id})`).join('\n')}
 
IMPORTANT:
- When user says "add product number X", "product number X", "the Xth one", "the first one" (X=1), "the second one" (X=2), "the last one", ALWAYS use the corresponding productId from the list above (ID: ${lastSearchResults.map((p: any) => p.id).join(' or ')}).
- "the first one" = product number 1 (index 1)
- "the second one" = product number 2 (index 2)  
- "the third one" = product number 3 (index 3)
- "the last one" = last product in the list
- NEVER skip or create fake productId - always use real ID from the list above.
- If user asks about specifications, configuration, features of a product (e.g., "what are iPhone 17 specs?", "how much RAM?", "battery capacity?"), call getProductDetails with productName as the product name to get specs info.
- If user only says "product number X" or product name WITHOUT an action verb (like "add", "buy", "remove"), call getProductDetails with corresponding productId to display info, then ask user what they want to do next.`;
    }
    
    const userIdValue = userId || '';
    const ctxJson = JSON.stringify({ current_user_id: userIdValue });
    const systemPrompt = `You are TGDD AI — the intelligent voice assistant for TGDD, Vietnam's largest electronics retail system.
You communicate primarily in English. Keep responses brief (1-3 sentences). Always call tools for shopping actions — never create fake data.
When you have search results, don't hardcode like "Found 5 products". Decide to introduce 1 to 5 most relevant products based on user context.
For all results from searchProducts or filterProductsByPrice: MUST list products immediately in the same response, DO NOT ask the user again. DO NOT insert URLs or links in responses.
When tools return product_details, express naturally based on product/specs, avoid mechanical listing, avoid repeating information, and skip less useful details.

When users ask about their orders, get current_user_id from this JSON data and pass it to userId parameter: ${ctxJson}
${conversationHistory.length > 0 ? `\n\n## Recent conversation:\n${conversationHistory.map(h => `${h.role === 'user' ? 'User' : 'AI'}: ${h.content}`).join('\n')}` : ''}${productContext}`;
    
    const messages = [{ role: 'user', content: userText }];
    
    const result = await generateText({
      model: workersai('@cf/nvidia/nemotron-3-120b-a12b') as any,
      system: systemPrompt,
      messages: messages as any,
      tools: mcpTools as any,
    });
    
    let responseText = result.text;
    if (!responseText && (result as any).toolResults?.length) {
      const toolResults = (result as any).toolResults;
      const lastTool = toolResults[toolResults.length - 1];
      if (lastTool.output?.content?.[0]?.text) {
        try {
          const parsed = JSON.parse(lastTool.output.content[0].text);
          const hasProductDetailsPayload = parsed?.action === 'product_details' && parsed?.product;
          if (hasProductDetailsPayload) {
            try {
              const synthesis = await generateText({
                model: workersai('@cf/nvidia/nemotron-3-120b-a12b') as any,
                system: 'You are a TGDD product consultant. Summarize naturally and briefly in 2-3 sentences in pure English, without foreign words or strange characters. Only select truly useful points from specs data, avoid repetition, avoid mechanical listing, skip low-value fields.',
                messages: [{
                  role: 'user',
                  content: `Product data: ${JSON.stringify(parsed.product)}. Provide brief advice and end with an appropriate follow-up question (compare or add to cart).`,
                }] as any,
              });
              responseText = synthesis.text?.trim() || parsed.message || '';
            } catch {
              responseText = parsed.message || '';
            }
          } else {
            responseText = parsed.message || parsed.answer || '';
          }
        } catch {
          responseText = lastTool.output.content[0].text;
        }
      }
    }
    
    // TTS: Generate audio from response using Aura
    let audioBase64 = null;
    if (responseText) {
      try {
        const tts = await (env.AI as any).run('@cf/deepgram/aura-2-en', {
          text: responseText,
          speaker: 'luna',
          encoding: 'mp3',
          container: 'none'
        });
        audioBase64 = (tts as any).audio_content || null;
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
    const { processIntent, buildSearchResponseText } = await import('./intent');
    const intentResult = processIntent(result.toolResults || [], userText);
    let action = intentResult.action;
    const searchResults = intentResult.searchResults;
    const toolResults = result.toolResults || [];

    if (action?.type === 'search' || action?.type === 'filter') {
      responseText = buildSearchResponseText(searchResults, userText);
    }

    const looksLikeAddToCart = /(add|put).*(cart|basket)|(cart|basket).*(add|put)/i.test(userText);
    if (looksLikeAddToCart && toolResults.length === 0 && !action) {
      action = {
        type: 'add_to_cart_failed',
        payload: { success: false, message: 'I cannot add to cart right now. Please try again.' },
      };
    }

    if (action?.type === 'add_to_cart' && (!action.payload?.success || !action.payload?.product)) {
      action.type = 'add_to_cart_failed';
    }

    const wantsBinary = shouldReturnBinary(c, response_format);
    if (audioBase64 && wantsBinary) return buildMp3BinaryResponse(audioBase64);

    return c.json({
      transcribed_text: userText,
      response_text: responseText,
      audio_base64: audioBase64,
      tool_results: result.toolResults,
      action,
      search_results: searchResults,
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
