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
    // Selection/ordinal phrases - normalize to "sản phẩm thứ X" pattern
    'cái đầu tiên': 'sản phẩm thứ 1', 'cái thứ nhất': 'sản phẩm thứ 1', 'đầu tiên': 'sản phẩm thứ 1',
    'cái thứ hai': 'sản phẩm thứ 2', 'cái thứ 2': 'sản phẩm thứ 2', 'thứ hai': 'sản phẩm thứ 2',
    'cái thứ ba': 'sản phẩm thứ 3', 'cái thứ 3': 'sản phẩm thứ 3', 'thứ ba': 'sản phẩm thứ 3',
    'cái thứ tư': 'sản phẩm thứ 4', 'cái thứ 4': 'sản phẩm thứ 4', 'thứ tư': 'sản phẩm thứ 4',
    'cái thứ năm': 'sản phẩm thứ 5', 'cái thứ 5': 'sản phẩm thứ 5', 'thứ năm': 'sản phẩm thứ 5',
    'cái cuối cùng': 'sản phẩm cuối cùng', 'cuối cùng': 'sản phẩm cuối cùng',
    // Fix STT misrecognitions
    'đầu điển thoại': 'đầu tiên',
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
    if (!audio_base64) return c.json({ error: 'Thiếu dữ liệu âm thanh (audio_base64)' }, 400);
    const response = await (c.env.AI as any).run('@cf/openai/whisper-large-v3-turbo', {
      audio: audio_base64, language: 'vi',
      initial_prompt: 'Cửa hàng điện máy Việt Nam. Tên sản phẩm bao gồm: iPhone, Samsung Galaxy, OPPO, Xiaomi, MacBook, Dell.',
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
    if (!text) return c.json({ error: 'Thiếu nội dung văn bản' }, 400);
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

// ── New voice/process endpoint for Android ──────────────────────────────────
app.post('/voice/process', async (c) => {
  try {
    const { audio_base64, session_id, user_id, history } = await c.req.json();
    
    if (!audio_base64) {
      return c.json({ error: 'Missing audio_base64' }, 400);
    }

    const env = c.env;
    
    // STT: Transcribe audio
    let userText = '';
    try {
      const stt = await (env.AI as any).run('@cf/openai/whisper-large-v3-turbo', {
        audio: audio_base64,
        language: 'vi',
        initial_prompt: 'Cửa hàng điện máy Việt Nam. Tên sản phẩm: iPhone, Samsung, OPPO, Xiaomi, MacBook, Dell.'
      });
      userText = normalizeProductNames(stt.text || '');
    } catch (sttErr) {
      console.error('STT error:', sttErr);
      return c.json({ error: 'Failed to transcribe audio' }, 500);
    }

    if (!userText.trim()) {
      return c.json({ 
        text: 'Xin lỗi, tôi không nghe rõ.',
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

    const systemPrompt = `Bạn là TGDD AI — trợ lý giọng nói thông minh của Thế Giới Di Động (TGDD).
Bạn giao tiếp bằng tiếng Việt. Hãy trả lời ngắn gọn (1-3 câu). 
Luôn gọi công cụ (tool) cho các hành động mua sắm — không tự tạo dữ liệu giả.
Khi người dùng muốn thanh toán hoặc đặt hàng, hãy xác nhận và hướng dẫn họ đến trang thanh toán.
${conversationHistory.length > 0 ? `\n\n## Cuộc trò chuyện gần đây:\n${conversationHistory.map((h: any) => `${h.role === 'user' ? 'User' : 'AI'}: ${h.content}`).join('\n')}` : ''}`;

    const messages = [{ role: 'user', content: userText }];

    const result = await generateText({
      model: workersai('@cf/nvidia/nemotron-3-120b-a12b') as any,
      system: systemPrompt,
      messages: messages as any,
      tools: mcpTools as any,
    });

    let responseText = result.text || 'Tôi đã xử lý yêu cầu của bạn.';

    // TTS: Generate audio response
    let audioBase64 = null;
    try {
      const tts = await (env.AI as any).run('@cf/myshell-ai/melotts', {
        prompt: responseText.slice(0, 500),
        lang: 'en'
      });
      audioBase64 = (tts as any).audio || tts;
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

    // Check if user wants to checkout
    const checkoutKeywords = /(thanh toán|đặt hàng|checkout|mua|order)/i;
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

    return c.json({
      text: responseText,
      audio_base64: audioBase64,
      intent: intent,
      navigate_to: navigateTo
    });
  } catch (error: any) {
    console.error('Voice process error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/voice-process', async (c) => {
  try {
    const { text: inputText, audio_base64, session_id, context } = await c.req.json();
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
          language: 'vi',
          initial_prompt: 'Cửa hàng điện máy Việt Nam. Tên sản phẩm: iPhone, Samsung, OPPO, Xiaomi, MacBook, Dell.'
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
    }, lastSearchResults, userId || '');
    await mcpServer.connect(serverTransport);
    
    const mcpClient = await createMCPClient({ transport: clientTransport as any });
    const mcpTools = await mcpClient.tools();
    
    // Build product context for the LLM
    let productContext = '';
    if (lastSearchResults.length > 0) {
      productContext = `
## Sản phẩm đã hiển thị trước đó:
${lastSearchResults.map((p: any) => `${p.index}. ${p.name} - ${p.price?.toLocaleString('vi-VN') || 'N/A'} VND (ID: ${p.id})`).join('\n')}
 
QUAN TRỌNG:
- Khi người dùng nói "thêm sản phẩm thứ X", "sản phẩm thứ X", "cái thứ X", "cái đầu tiên" (X=1), "cái thứ hai" (X=2), "cái cuối cùng", LUÔN LUÔN sử dụng productId tương ứng từ danh sách trên (ID: ${lastSearchResults.map((p: any) => p.id).join(' hoặc ')}).
- "cái đầu tiên" = sản phẩm thứ 1 (index 1)
- "cái thứ hai" = sản phẩm thứ 2 (index 2)  
- "cái thứ ba" = sản phẩm thứ 3 (index 3)
- "cái cuối cùng" = sản phẩm cuối cùng trong danh sách
- KHÔNG BAO GIỜ bỏ qua hoặc tự tạo productId - luôn sử dụng ID thực từ danh sách trên.
- Nếu người dùng hỏi về thông số kỹ thuật, cấu hình, tính năng của sản phẩm (ví dụ: "cấu hình iPhone 17 là gì?", "RAM bao nhiêu?", "pin bao nhiêu mAh?"), hãy gọi getProductDetails với productName là tên sản phẩm để lấy thông tin specs.
- Nếu người dùng chỉ nói "sản phẩm thứ X" hoặc tên sản phẩm mà KHÔNG có động từ hành động (như "thêm", "mua", "xóa"), hãy gọi getProductDetails với productId tương ứng để hiển thị thông tin, rồi hỏi người dùng muốn làm gì tiếp theo.`;
    }
    
    const userIdValue = userId || '';
    const ctxJson = JSON.stringify({ current_user_id: userIdValue });
    const systemPrompt = `Bạn là TGDD AI — trợ lý giọng nói thông minh của Thế Giới Di Động (TGDD), hệ thống bán lẻ điện tử lớn nhất Việt Nam.
Bạn giao tiếp chủ yếu bằng tiếng Việt. Hãy trả lời ngắn gọn (1-3 câu). Luôn gọi công cụ (tool) cho các hành động mua sắm — không bao giờ tự tạo dữ liệu giả.
Khi có danh sách kết quả tìm kiếm, không hardcode kiểu "Tìm thấy 5 sản phẩm". Hãy tự quyết định giới thiệu từ 1 đến 5 sản phẩm phù hợp nhất với ngữ cảnh người dùng.
Với mọi kết quả từ searchProducts hoặc filterProductsByPrice: PHẢI liệt kê ngay danh sách sản phẩm trong cùng câu trả lời, KHÔNG hỏi lại người dùng. KHÔNG chèn URL hoặc link trong câu trả lời.
Khi tool trả về product_details, hãy tự diễn đạt tự nhiên dựa trên product/specs, tránh liệt kê máy móc, tránh lặp thông tin, và bỏ qua các chi tiết kém hữu ích.

Khi người dùng hỏi về đơn hàng của họ, hãy lấy current_user_id từ dữ liệu JSON này và truyền vào tham số userId: ${ctxJson}
${conversationHistory.length > 0 ? `\n\n## Cuộc trò chuyện gần đây:\n${conversationHistory.map(h => `${h.role === 'user' ? 'User' : 'AI'}: ${h.content}`).join('\n')}` : ''}${productContext}`;
    
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
                system: 'Bạn là tư vấn viên sản phẩm TGDD. Tóm tắt tự nhiên, ngắn gọn 2-3 câu bằng tiếng Việt thuần, không dùng từ/cụm từ ngoại ngữ hoặc ký tự lạ. Chỉ chọn các điểm thật sự hữu ích từ dữ liệu specs, tránh lặp, tránh liệt kê máy móc, bỏ qua trường kém giá trị.',
                messages: [{
                  role: 'user',
                  content: `Dữ liệu sản phẩm: ${JSON.stringify(parsed.product)}. Hãy tư vấn ngắn gọn và kết bằng một câu hỏi tiếp theo phù hợp (so sánh hoặc thêm vào giỏ).`,
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
    const { processIntent, buildSearchResponseText } = await import('./intent');
    const intentResult = processIntent(result.toolResults || [], userText);
    let action = intentResult.action;
    const searchResults = intentResult.searchResults;
    const toolResults = result.toolResults || [];

    if (action?.type === 'search' || action?.type === 'filter') {
      responseText = buildSearchResponseText(searchResults, userText);
    }

    const looksLikeAddToCart = /(thêm|add).*(giỏ hàng|cart)|(giỏ hàng|cart).*(thêm|add)/i.test(userText);
    if (looksLikeAddToCart && toolResults.length === 0 && !action) {
      action = {
        type: 'add_to_cart_failed',
        payload: { success: false, message: 'Tôi chưa thể thêm vào giỏ hàng lúc này. Vui lòng thử lại.' },
      };
    }

    if (action?.type === 'add_to_cart' && (!action.payload?.success || !action.payload?.product)) {
      action.type = 'add_to_cart_failed';
    }

    return c.json({
      transcribed_text: userText,
      response_text: responseText,
      audio_base64: null,
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
