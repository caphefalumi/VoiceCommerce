import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  DB: D1Database;
  AI: any;
  VECTORIZE: any;
  VECTORIZE_FAQ: any;
};

// Product name normalization for Vietnamese speech
function normalizeProductNames(text: string): string {
  if (!text) return text;
  
  let normalized = text;
  
  // Brand name mappings (Vietnamese phonetic → English)
  const brandMappings: Record<string, string> = {
    'aiphone': 'iPhone',
    'ipon': 'iPhone',
    'ipong': 'iPhone',
    'iphon': 'iPhone',
    'iphone': 'iPhone',
    'ôpô': 'OPPO',
    'oppo': 'OPPO',
    'sam sung': 'Samsung',
    'samsung': 'Samsung',
    'xiomi': 'Xiaomi',
    'xiaomi': 'Xiaomi',
    'hoa vi': 'Huawei',
    'huawei': 'Huawei',
    'vivo': 'Vivo',
    'realme': 'Realme',
    'nokia': 'Nokia',
    'macbook': 'MacBook',
    'mac book': 'MacBook',
    'dell': 'Dell',
    'hp': 'HP',
    'asus': 'ASUS',
    'lenovo': 'Lenovo',
    'honor': 'HONOR',
    'kidcare': 'Kidcare',
  };
  
  // Model number mappings (Vietnamese words → digits)
  const modelMappings: Record<string, string> = {
    'mười lăm': '15',
    'mười bốn': '14', 
    'mười ba': '13',
    'mười hai': '12',
    'mười một': '11',
    'mười': '10',
    'tám': '8',
    'bảy': '7',
    'sáu': '6',
    'năm': '5',
    'tư': '4',
    'ba': '3',
    'hai': '2',
    'một': '1',
  };
  
  // Apply brand mappings (case insensitive)
  for (const [vn, en] of Object.entries(brandMappings)) {
    const regex = new RegExp(vn, 'gi');
    normalized = normalized.replace(regex, en);
  }
  
  // Apply model number mappings (case insensitive, word boundary)
  for (const [vn, en] of Object.entries(modelMappings)) {
    const regex = new RegExp('\\b' + vn + '\\b', 'gi');
    normalized = normalized.replace(regex, en);
  }
  
  // Fix common patterns: "find x 8" → "find x8", "galaxy s 24" → "galaxy s24"
  normalized = normalized.replace(/\b(x)\s+(\d+)\b/gi, '$1$2');
  normalized = normalized.replace(/\b(s)\s+(\d+)\b/gi, '$1$2');
  normalized = normalized.replace(/\b(plus)\s+(\d+)\b/gi, '$1$2');
  
  // Common Vietnamese phrase corrections (Whisper misrecognitions)
  const phraseMappings: Record<string, string> = {
    'giảnh hẹn': 'giỏ hàng',
    'giánh hẹn': 'giỏ hàng',
    'giành hẹn': 'giỏ hàng',
    'dành hẹn': 'giỏ hàng',
    'giản hẹn': 'giỏ hàng',
    'dỏ hàng': 'giỏ hàng',
    'giỏ hang': 'giỏ hàng',
    'gio hang': 'giỏ hàng',
    'gỏ hàng': 'giỏ hàng',
  };
  
  for (const [wrong, correct] of Object.entries(phraseMappings)) {
    const regex = new RegExp(wrong, 'gi');
    normalized = normalized.replace(regex, correct);
  }
  
  return normalized;
}

// --- RAG: Embedding Functions ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateEmbedding(text: string, env: any): Promise<number[]> {
  try {
    const response = await env.AI.run('@cf/baai/bge-m3', { text: [text] });
    return response.data[0];
  } catch (e) { console.error('Embedding error:', e); return []; }
}

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors({ origin: '*' }));

app.get('/health', (c) => c.json({ status: 'ok' }));

// ── STT ────────────────────────────────────────────────────────────────────
app.post('/stt', async (c) => {
  try {
    const { audio_base64 } = await c.req.json();
    if (!audio_base64) return c.json({ error: 'Missing audio_base64' }, 400);

    const response = await c.env.AI.run('@cf/openai/whisper-large-v3-turbo', {
      audio: audio_base64,
      language: 'vi',
      initial_prompt: 'Vietnamese electronics store. Product names in English: iPhone, Samsung Galaxy, OPPO, Xiaomi, MacBook, Dell.',
    });
    return c.json({ text: response.text });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ── Embeddings ─────────────────────────────────────────────────────────────
app.post('/embed', async (c) => {
  try {
    const { text } = await c.req.json();
    if (!text) return c.json({ error: 'Missing text' }, 400);

    const response = await c.env.AI.run('@cf/baai/bge-m3', { text: [text] });
    return c.json({ embedding: response.data[0] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ── LLM Chat ───────────────────────────────────────────────────────────────
app.post('/chat', async (c) => {
  try {
    const { prompt } = await c.req.json();
    if (!prompt) return c.json({ error: 'Missing prompt' }, 400);

    const systemPrompt = `You are an AI Voice Assistant for a Vietnamese electronics store (Thế giới di động).
Help customers search for products, add items to cart, or answer questions.
You MUST respond ONLY with valid JSON in this exact format:
{
  "intent": "product_search|add_to_cart|checkout_start|faq|general",
  "action": {
    "type": "search|add_to_cart|chat",
    "query": "<search query if type is search>",
    "payload": {}
  },
  "response_text": "<2-3 sentence Vietnamese or English response>"
}`;

    const response = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ]
    });

    // Strip markdown fences if present
    let jsonStr = response.response;
    const fenced = jsonStr.match(/```json\n?([\s\S]*?)\n?```/);
    if (fenced) jsonStr = fenced[1];
    const start = jsonStr.indexOf('{');
    const end = jsonStr.lastIndexOf('}');
    if (start !== -1 && end !== -1) jsonStr = jsonStr.substring(start, end + 1);

    try {
      const parsed = JSON.parse(jsonStr);

      // --- RAG IMPLEMENTATION FOR CHAT ---
      if (parsed.intent === 'product_search' && parsed.action?.query) {
        try {
          const searchTerm = `%${parsed.action.query}%`;
          const stmt = c.env.DB.prepare('SELECT * FROM products WHERE name LIKE ? OR description LIKE ? LIMIT 10');
          const products: any = await stmt.bind(searchTerm, searchTerm).all();
          
          if (products.results && products.results.length > 0) {
            const items = products.results.slice(0, 3).map((p: any) => `- ${p.name}: ${p.price.toLocaleString('vi-VN')} VND`).join('\n');
            const ragPrompt = `You are a helpful Vietnamese AI Assistant for Thế giới di động.
The user asked: "${prompt}"
You found these products in the database:
${items}
Write a 1-2 sentence response informing the user about these found products in Vietnamese. Do not use markdown. Do not include JSON.`;

            const ragResult = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {
              messages: [{ role: 'system', content: ragPrompt }]
            });
            parsed.response_text = ragResult.response.replace(/```[\s\S]*?```/g, '').trim();
          } else {
            parsed.response_text = "Dạ, hiện tại cửa hàng không tìm thấy sản phẩm nào liên quan đến từ khóa của bạn.";
          }
        } catch (e) {
          console.error("RAG Error in chat", e);
        }
      }

      return c.json(parsed);
    } catch {
      return c.json({
        intent: 'general',
        action: { type: 'chat', query: null, payload: {} },
        response_text: response.response.replace(/```[\s\S]*?```/g, '').trim()
      });
    }
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ── TTS ────────────────────────────────────────────────────────────────────
app.post('/tts', async (c) => {
  try {
    const { text } = await c.req.json();
    if (!text) return c.json({ error: 'Missing text' }, 400);

    const response = await c.env.AI.run('@cf/myshell-ai/melo-tts', {
      prompt: text,
      language: 'EN'
    });

    const bytes = new Uint8Array(response);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);

    return c.json({ audio_base64: btoa(binary) });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ── Full orchestration: STT → LLM → TTS  (used by the Java backend) ────────
app.post('/voice-process', async (c) => {
  try {
    const { audio_base64, text: inputText, session_id, context } = await c.req.json();

    // Step 1: STT (skip if plain text was already provided)
    let transcribedText: string = inputText ?? '';
    if (!transcribedText && audio_base64) {
      const sttResult = await c.env.AI.run('@cf/openai/whisper-large-v3-turbo', {
        audio: audio_base64,
        language: 'vi',
        initial_prompt: 'Vietnamese electronics store. Product names in English: iPhone, Samsung Galaxy, OPPO, Xiaomi, MacBook, Dell.',
      });
      transcribedText = sttResult.text ?? '';
    }

    // Normalize product names after STT, before LLM
    const normalizedText = normalizeProductNames(transcribedText);

    // Step 2: LLM
    const contextStr = context && Object.keys(context).length > 0
      ? `Previous context: ${JSON.stringify(context)}\n\n`
      : '';
    const userPrompt = `${contextStr}User said: "${normalizedText}"`;

    const systemPrompt = `You are TGDD AI — the voice assistant for Thế giới di động, Vietnam's largest electronics retailer.
Your ONLY job is to classify the user's Vietnamese request into one of 9 intents and return VALID JSON — no prose, no markdown.

═══════════════════════════════════════════════════
INTENT 1: product_search
Trigger: user wants to browse/find products by name or category.
Examples: "Tìm iPhone", "Cho tôi xem điện thoại Samsung", "laptop gaming", "tai nghe không dây"
JSON:
{"intent":"product_search","action":{"type":"search","query":"<product name or category>","selection":null,"payload":{}},"response_text":"<1 sentence Vietnamese>"}

INTENT 2: product_filter_price
Trigger: user mentions a price constraint with or without product type.
Examples: "điện thoại dưới 10 triệu", "laptop từ 15 đến 20 triệu", "iPhone dưới 30 triệu"
JSON:
{"intent":"product_filter_price","action":{"type":"filter","query":"<product + price range>","selection":null,"payload":{}},"response_text":"<1 sentence Vietnamese>"}

INTENT 3: product_compare
Trigger: user wants to compare 2 or more products.
Examples: "so sánh iPhone 15 và Samsung Galaxy S24", "so sánh OPPO và Xiaomi"
JSON:
{"intent":"product_compare","action":{"type":"compare","query":"<all product names separated by 'và'>","selection":null,"payload":{}},"response_text":"<1 sentence Vietnamese>"}

INTENT 4: add_to_cart
Trigger: user wants to add to cart — either by product name OR by selecting from a previously shown list.
- By name: "Thêm iPhone 15 vào giỏ", "Mua Samsung Galaxy S24", "Cho tôi chiếc này"
  → set query=product name, selection=null
- By position: "Cái đầu tiên"/"Số 1" → selection="1", query=null
               "Cái thứ 2"/"Số 2" → selection="2", query=null
               "Cái thứ 3"/"Số 3" → selection="3", query=null
JSON:
{"intent":"add_to_cart","action":{"type":"add_to_cart","query":"<product name or null>","selection":"<'1'|'2'|'3'|'4'|'5' or null>","payload":{}},"response_text":"<1 sentence Vietnamese confirming action>"}

INTENT 5: remove_from_cart
Trigger: user wants to remove something from cart.
Examples: "Xóa iPhone khỏi giỏ hàng", "Bỏ sản phẩm đầu tiên", "Hủy thêm vào giỏ"
JSON:
{"intent":"remove_from_cart","action":{"type":"remove_from_cart","query":"<product name or null>","selection":null,"payload":{}},"response_text":"<1 sentence Vietnamese>"}

INTENT 6: checkout_start
Trigger: user wants to proceed to payment/checkout.
Examples: "Thanh toán", "Đặt hàng", "Mua hàng", "Tiến hành thanh toán", "Tôi muốn mua"
JSON:
{"intent":"checkout_start","action":{"type":"checkout","query":null,"selection":null,"payload":{}},"response_text":"Đang chuyển đến trang thanh toán."}

INTENT 7: order_status
Trigger: user asks about their existing orders.
Examples: "Đơn hàng của tôi đâu", "Kiểm tra đơn hàng", "Đơn hàng đã giao chưa", "Tôi muốn xem lịch sử mua hàng"
JSON:
{"intent":"order_status","action":{"type":"order_status","query":null,"selection":null,"payload":{}},"response_text":"<1 sentence Vietnamese asking for order code>"}

INTENT 8: faq
Trigger: user asks a general policy or store question.
Examples: "Chính sách đổi trả như thế nào", "Bảo hành bao lâu", "Giờ mở cửa", "Giao hàng mất mấy ngày", "Trả góp được không", "Thanh toán bằng gì"
JSON:
{"intent":"faq","action":{"type":"chat","query":"<topic: đổi trả|bảo hành|giờ mở cửa|giao hàng|trả góp|thanh toán>","selection":null,"payload":{}},"response_text":"<answer in Vietnamese>"}

INTENT 9: create_ticket
Trigger: user wants to report an issue or request support.
Examples: "Tôi muốn khiếu nại", "Tạo yêu cầu hỗ trợ", "Sản phẩm bị lỗi", "Tôi cần gặp nhân viên", "Báo lỗi sản phẩm"
JSON:
{"intent":"create_ticket","action":{"type":"create_ticket","query":"<issue description>","selection":null,"payload":{}},"response_text":"Đã ghi nhận yêu cầu hỗ trợ. Nhân viên sẽ liên hệ bạn trong 24 giờ."}

═══════════════════════════════════════════════════
RULES:
1. Return ONLY the JSON object — no text before or after, no markdown fences.
2. response_text MUST be in Vietnamese and 1-2 sentences max.
3. For add_to_cart: NEVER set both query and selection — use one or the other.
4. If intent is unclear, use "general" with type "chat".
5. Product names stay in their original language (iPhone, Samsung, OPPO, etc.).
═══════════════════════════════════════════════════`;


    const llmResult = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    });

    let llmJson: any = { intent: 'general', action: { type: 'chat', query: null, payload: {} }, response_text: '' };
    try {
      let jsonStr: string = llmResult.response;
      const fenced = jsonStr.match(/```json\n?([\s\S]*?)\n?```/);
      if (fenced) jsonStr = fenced[1];
      const s = jsonStr.indexOf('{'), e = jsonStr.lastIndexOf('}');
      if (s !== -1 && e !== -1) jsonStr = jsonStr.substring(s, e + 1);
      llmJson = JSON.parse(jsonStr);

      // --- PRODUCT SEARCH / FILTER - LIST MULTIPLE PRODUCTS (Vectorize RAG) ---
      if ((llmJson.intent === 'product_search' || llmJson.intent === 'product_filter_price') && llmJson.action?.query) {
        try {
          const searchQuery = llmJson.action.query;

          // Extract price filter from query
          let minPrice = 0;
          let maxPrice = 100_000_000;
          if (searchQuery.includes('dưới') || searchQuery.includes('dươi')) {
            const match = searchQuery.match(/(\d+)\s*triệu/i);
            if (match) maxPrice = parseInt(match[1]) * 1_000_000;
          }
          if (searchQuery.includes('trên')) {
            const match = searchQuery.match(/(\d+)\s*triệu/i);
            if (match) minPrice = parseInt(match[1]) * 1_000_000;
          }

          // Step 1: Embed the query (single call)
          const queryEmbedding = await generateEmbedding(
            `sản phẩm: ${searchQuery}`,
            c.env
          );

          let results: any[] = [];

          // Step 2: Query Vectorize — ANN lookup, metadata contains name/brand/price/category
          if (queryEmbedding.length > 0 && c.env.VECTORIZE) {
            try {
              const vectorizeResult = await c.env.VECTORIZE.query(queryEmbedding, {
                topK: 20,
                returnMetadata: 'all',
              });

              const matches = vectorizeResult?.matches ?? [];

              // Build results directly from Vectorize metadata (no backend call needed)
              results = matches
                .filter((m: any) => {
                  const price = Number(m.metadata?.price || 0);
                  return price >= minPrice && price <= maxPrice;
                })
                .slice(0, 5)
                .map((m: any) => ({
                  id: m.id,
                  name: m.metadata?.name || '',
                  brand: m.metadata?.brand || '',
                  price: Number(m.metadata?.price || 0),
                  category: m.metadata?.category || '',
                  score: m.score,
                }));
            } catch (vecErr) {
              console.error('Vectorize query error:', vecErr);
            }
          }


          if (results.length > 0) {
            llmJson.action.payload = { results };
            const itemsList = results.map((p: any, i: number) =>
              `${i + 1}. ${p.name}: ${Number(p.price).toLocaleString('vi-VN')} VND`
            ).join('\n');
            llmJson.response_text = `Tôi tìm thấy ${results.length} sản phẩm phù hợp:\n${itemsList}\nBạn muốn chọn sản phẩm nào?`;
          } else {
            llmJson.response_text = "Dạ, em rất tiếc là hiện tại cửa hàng không có sản phẩm nào phù hợp ạ.";
          }
        } catch (e) {
          console.error("Product search error", e);
        }
      }

      // --- ADD TO CART (with selection from context or new search) ---
      if (llmJson.intent === 'add_to_cart') {
        try {
          // Parse selection index from Vietnamese ordinals
          const selection = (llmJson.action.selection || '').toString().toLowerCase();
          let productIndex = -1;

          if (selection === 'first' || selection === 'đầu tiên' || selection === '1') productIndex = 0;
          else if (selection === 'second' || selection === 'thứ 2' || selection === 'thứ hai' || selection === '2') productIndex = 1;
          else if (selection === 'third' || selection === 'thứ 3' || selection === 'thứ ba' || selection === '3') productIndex = 2;
          else if (selection === 'fourth' || selection === 'thứ 4' || selection === 'thứ tư' || selection === '4') productIndex = 3;
          else if (selection === 'fifth' || selection === 'thứ 5' || selection === 'thứ năm' || selection === '5') productIndex = 4;

          const lastProducts = context?.last_products;

          // Path A: User selected by position from a previous product list
          if (productIndex >= 0 && Array.isArray(lastProducts) && lastProducts.length > 0) {
            const product = lastProducts[Math.min(productIndex, lastProducts.length - 1)];
            llmJson.action.type = 'add_to_cart';
            llmJson.action.payload = { product };
            llmJson.response_text = `Đã thêm ${product.name} vào giỏ hàng! Giá ${Number(product.price).toLocaleString('vi-VN')} VND.`;

          // Path B: User named a product — use Vectorize (no localhost call)
          } else if (llmJson.action.query && c.env.VECTORIZE) {
            const queryEmbedding = await generateEmbedding(`sản phẩm: ${llmJson.action.query}`, c.env);
            if (queryEmbedding.length > 0) {
              const vecResult = await c.env.VECTORIZE.query(queryEmbedding, { topK: 1, returnMetadata: 'all' });
              const match = vecResult?.matches?.[0];
              if (match?.metadata?.name) {
                const product = {
                  id: match.id,
                  name: match.metadata.name,
                  brand: match.metadata.brand || '',
                  price: Number(match.metadata.price || 0),
                  category: match.metadata.category || '',
                  images: [],
                  specs: [],
                  reviews: [],
                };
                llmJson.action.type = 'add_to_cart';
                llmJson.action.payload = { product };
                llmJson.response_text = `Đã thêm ${product.name} vào giỏ hàng! Giá ${product.price.toLocaleString('vi-VN')} VND.`;
              } else {
                llmJson.response_text = 'Dạ, em không tìm thấy sản phẩm đó trong cửa hàng ạ.';
              }
            }
          } else if (productIndex < 0 && !llmJson.action.query) {
            llmJson.response_text = 'Bạn muốn thêm sản phẩm nào? Hãy cho tôi biết tên hoặc chọn từ danh sách.';
          }
        } catch (e) {
          console.error('Add to cart error', e);
          llmJson.response_text = 'Không thể thêm sản phẩm vào giỏ hàng lúc này. Vui lòng thử lại.';
        }

      }

      // --- REMOVE FROM CART ---
      if (llmJson.intent === 'remove_from_cart') {
        llmJson.action.type = 'remove_from_cart';
        llmJson.response_text = llmJson.response_text || "Đã xóa sản phẩm khỏi giỏ hàng.";
      }

      // --- PRODUCT COMPARE — Vectorize-powered, no backend call ---
      if (llmJson.intent === 'product_compare' && llmJson.action?.query && c.env.VECTORIZE) {
        try {
          const queryEmbedding = await generateEmbedding(`sản phẩm: ${llmJson.action.query}`, c.env);
          if (queryEmbedding.length > 0) {
            const vecResult = await c.env.VECTORIZE.query(queryEmbedding, { topK: 5, returnMetadata: 'all' });
            const matches = vecResult?.matches ?? [];
            const top2 = matches.slice(0, 2).map((m: any) => ({
              id: m.id,
              name: m.metadata?.name || '',
              brand: m.metadata?.brand || '',
              price: Number(m.metadata?.price || 0),
              category: m.metadata?.category || '',
              images: [],
            }));
            if (top2.length >= 2) {
              llmJson.action.type = 'compare';
              llmJson.action.payload = { results: top2 };
              const compareText = top2.map((p: any, i: number) =>
                `${i + 1}. ${p.name} - ${p.price.toLocaleString('vi-VN')} VND (${p.brand})`
              ).join('\n');
              llmJson.response_text = `So sánh sản phẩm:\n${compareText}\nBạn muốn biết thêm thông tin chi tiết không?`;
            } else {
              llmJson.response_text = 'Không tìm thấy đủ sản phẩm để so sánh. Bạn có thể nói rõ hơn tên sản phẩm không?';
            }
          }
        } catch (e) {
          console.error('Compare error', e);
        }
      }

      // --- CHECKOUT START ---
      if (llmJson.intent === 'checkout_start') {
        llmJson.action.type = 'checkout';
        llmJson.response_text = llmJson.response_text || 'OK, đang chuyển đến trang thanh toán. Bạn vui lòng xác nhận thông tin đơn hàng.';
      }

      // --- FAQ — Vectorize semantic search against tgdd-faq index ---
      if (llmJson.intent === 'faq' || llmJson.intent === 'customer_support_faq') {
        llmJson.action.type = 'chat';
        try {
          const faqQuery = llmJson.action.query || normalizedText || '';
          if (faqQuery && c.env.VECTORIZE_FAQ) {
            const faqEmbedding = await generateEmbedding(faqQuery, c.env);
            if (faqEmbedding.length > 0) {
              const faqResult = await c.env.VECTORIZE_FAQ.query(faqEmbedding, {
                topK: 1,
                returnMetadata: 'all',
              });
              const best = faqResult?.matches?.[0];
              // Only use Vectorize answer if similarity score is high enough
              if (best?.score >= 0.5 && best?.metadata?.answer) {
                llmJson.response_text = best.metadata.answer as string;
              } else {
                llmJson.response_text = 'Bạn có thể hỏi về: chính sách đổi trả, bảo hành, giờ mở cửa, giao hàng, trả góp, thanh toán, trả góp, hoặc liên hệ hotline 1800 2091.';
              }
            }
          } else {
            llmJson.response_text = 'Bạn có thể hỏi về: chính sách đổi trả, bảo hành, giờ mở cửa, giao hàng, trả góp, hoặc thanh toán.';
          }
        } catch (faqErr) {
          console.error('FAQ Vectorize error:', faqErr);
          llmJson.response_text = 'Vui lòng liên hệ hotline 1800 2091 để được hỗ trợ.';
        }
      }

      // --- ORDER STATUS ---
      if (llmJson.intent === 'order_status') {
        llmJson.action.type = 'order_status';
        llmJson.response_text = 'Vui lòng cung cấp mã đơn hàng để tra cứu trạng thái. Bạn có thể tìm mã trong email xác nhận hoặc SMS.';
      }

      // --- CREATE TICKET ---
      if (llmJson.intent === 'create_ticket') {
        llmJson.action.type = 'create_ticket';
        llmJson.response_text = llmJson.response_text || 'Đã ghi nhận yêu cầu hỗ trợ của bạn. Nhân viên chăm sóc khách hàng sẽ liên hệ bạn trong vòng 24 giờ.';
      }


    } catch {
      llmJson.response_text = llmResult.response.replace(/```[\s\S]*?```/g, '').trim();
    }

    // Step 3: TTS (non-fatal — frontend shows text anyway)
    let audioBase64Out: string | null = null;
    if (llmJson.response_text) {
      try {
        const ttsResult = await c.env.AI.run('@cf/myshell-ai/melo-tts', {
          prompt: llmJson.response_text,
          language: 'EN'
        });
        const bytes = new Uint8Array(ttsResult);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        audioBase64Out = btoa(binary);
      } catch {
        audioBase64Out = null;
      }
    }

    return c.json({
      session_id,
      transcribed_text: transcribedText,
      intent: llmJson.intent,
      action: llmJson.action,
      response_text: llmJson.response_text,
      audio_base64: audioBase64Out
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default app;
