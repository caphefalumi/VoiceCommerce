/// <reference types="@cloudflare/workers-types" />
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export type Env = {
  AI: Fetcher;
  VECTORIZE: VectorizeIndex;
  VECTORIZE_FAQ: VectorizeIndex;
  DB: D1Database;
};

// ── Logging ───────────────────────────────────────────────────────────────────

type LogLevel = 'info' | 'warn' | 'error';
function log(level: LogLevel, event: string, fields: Record<string, unknown> = {}): void {
  const entry = { ts: new Date().toISOString(), level, service: 'ai-worker-mcp', event, ...fields };
  level === 'error' ? console.error(JSON.stringify(entry)) : console.log(JSON.stringify(entry));
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

type LastSearchResult = { id: string; name: string; price: number; index: number };

function resolveOrdinal(text: string): number | null {
  const t = text.toLowerCase().trim();
  const wordMap: Record<string, number> = {
    'nhất': 1, 'một': 1, '1': 1, 'đầu tiên': 1,
    'hai': 2, '2': 2,
    'ba': 3, '3': 3,
    'tư': 4, 'bốn': 4, '4': 4,
    'năm': 5, '5': 5,
  };
  const m = t.match(/(?:thứ\s+|số\s+)(\S+)/);
  if (m) return wordMap[m[1]] ?? null;
  if (/đầu tiên/.test(t)) return 1;
  return null;
}

async function fetchSpecs(productId: string, env: Env): Promise<any[]> {
  if (!productId || !env.DB) return [];
  try {
    const { results } = await env.DB.prepare('SELECT specs FROM products WHERE id = ?').bind(productId).all();
    if (!results.length || !(results[0] as any).specs) return [];
    const raw = (results[0] as any).specs as string;
    try { return JSON.parse(raw); } catch {
      try {
        return JSON.parse(raw.replace(/\\u([0-9a-fA-F]{4})/g, (_: string, c: string) => String.fromCharCode(parseInt(c, 16))));
      } catch { return []; }
    }
  } catch { return []; }
}


async function resolveProduct(
  productId: string | undefined,
  productName: string | undefined,
  env: Env,
  lastSearchResults: LastSearchResult[] = [],
): Promise<{id: string; name: string; brand: string; price: number; category: string; images: string[]} | null> {

  const textToCheck = productName || '';
  if (textToCheck && lastSearchResults.length > 0) {
    const ordinal = resolveOrdinal(textToCheck);
    if (ordinal !== null) {
      const match = lastSearchResults.find(p => p.index === ordinal) || lastSearchResults[ordinal - 1];
      if (match) {
        log('info', 'resolveProduct.ordinal', { ordinal, resolvedId: match.id, resolvedName: match.name });
        const { results } = await env.DB.prepare(
          'SELECT id, name, brand, price, category, images FROM products WHERE id = ?'
        ).bind(match.id).all().catch(() => ({ results: [] }));
        if (results.length > 0) {
          const row = results[0] as any;
          return { 
            id: row.id, 
            name: row.name, 
            brand: row.brand || '', 
            price: Number(row.price || 0), 
            category: row.category || '',
            images: row.images ? JSON.parse(row.images) : []
          };
        }
        return { id: match.id, name: match.name, brand: '', price: match.price, category: '', images: [] };
      }
    }
  }

  const cleanId = productId && productId !== 'null' ? productId.trim() : '';

  if (cleanId && env.DB) {
    try {
      const { results } = await env.DB.prepare(
        'SELECT id, name, brand, price, category, images FROM products WHERE id = ?'
      ).bind(cleanId).all();
      if (results.length > 0) {
        const row = results[0] as any;
        return { 
          id: row.id, 
          name: row.name, 
          brand: row.brand || '', 
          price: Number(row.price || 0), 
          category: row.category || '',
          images: row.images ? JSON.parse(row.images) : []
        };
      }
    } catch (e) {
      log('warn', 'resolveProduct.dbLookup', { error: String(e) });
    }
  }

  const searchTerm = productName || cleanId;
  if (!searchTerm) return null;

  const embedding = await generateEmbedding(searchTerm, env);
  if (!embedding.length || !env.VECTORIZE) return null;

  const result = await env.VECTORIZE.query(embedding, { topK: 10, returnMetadata: 'all' });
  const matches = result?.matches || [];
  if (matches.length === 0) return null;

  let match: any = null;

  if (productName) {
    const searchLower = productName.toLowerCase();
    match = matches.find((m: any) =>
      m.metadata?.name?.toLowerCase().includes(searchLower) ||
      searchLower.includes(m.metadata?.name?.toLowerCase())
    );
  }

  if (!match) {
    for (const m of matches.slice(0, 3)) {
      if ((m.score || 0) > 0.7 && m.metadata?.name) { match = m; break; }
    }
  }

  if (!match && matches[0]?.metadata?.name) match = matches[0];

  if (match?.metadata?.name) {
    return {
      id: match.id,
      name: match.metadata.name,
      brand: match.metadata.brand || '',
      price: Number(match.metadata.price || 0),
      category: match.metadata.category || '',
      images: match.metadata.images ? (typeof match.metadata.images === 'string' ? JSON.parse(match.metadata.images) : match.metadata.images) : [],
    };
  }

  return null;
}

export function createCommerceMcpServer(env: Env, lastSearchResults: LastSearchResult[] = [], userId?: string) {
  const ctxUserId = userId;
  const server = new McpServer({
    name: 'TGDD VoiceCommerce MCP Server',
    version: '2.0.0',
  });

  // 1. searchProducts
  server.registerTool(
    'searchProducts',
    {
      description: 'Tìm kiếm sản phẩm trong danh mục TGDD theo tên, model hoặc danh mục.',
      inputSchema: z.object({
        query: z.string().describe('Tên sản phẩm, model hoặc danh mục bằng tiếng Việt hoặc tiếng Anh'),
      })
    },
    async ({ query }) => {
      log('info', 'tool.searchProducts', { query });
      try {
        const embedding = await generateEmbedding(`sản phẩm: ${query}`, env);
        if (!embedding.length || !env.VECTORIZE) {
          return { content: [{ type: 'text', text: JSON.stringify({ results: [], message: 'Không thể tìm kiếm lúc này.' }) }] };
        }
        const vectorResult = await env.VECTORIZE.query(embedding, { topK: 10, returnMetadata: 'all' });
        let results = (vectorResult?.matches ?? []).map((m: any) => ({
          id: m.id,
          name: m.metadata?.name || '',
          brand: m.metadata?.brand || '',
          price: Number(m.metadata?.price || 0),
          category: m.metadata?.category || '',
        }));

        results = results.slice(0, 5);
        
        let message = `Không tìm thấy sản phẩm nào cho "${query}"`;
        if (results.length > 0) {
          const overview = results.slice(0, 3).map((r: any) => `${r.name} giá ${r.price.toLocaleString('vi-VN')} VND`).join(', ');
          message = `Tìm thấy ${results.length} sản phẩm. Một số sản phẩm tiêu biểu: ${overview}. Bạn muốn chọn sản phẩm nào?`;
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              results,
              count: results.length,
              message,
            })
          }]
        };
      } catch (e) {
        log('error', 'searchProducts error', { error: String(e) });
        return { content: [{ type: 'text', text: JSON.stringify({ results: [], message: 'Lỗi tìm kiếm. Vui lòng thử lại.' }) }] };
      }
    }
  );

  // 2. filterProductsByPrice
  server.registerTool(
    'filterProductsByPrice',
    {
      description: 'Tìm kiếm sản phẩm trong một khoảng giá.',
      inputSchema: z.object({
        query: z.string().describe('Loại hoặc tên sản phẩm'),
        minPrice: z.union([z.number(), z.string()]).optional().describe('Giá tối thiểu bằng VND'),
        maxPrice: z.union([z.number(), z.string()]).optional().describe('Giá tối đa bằng VND'),
      })
    },
    async ({ query, minPrice, maxPrice }) => {
      log('info', 'tool.filterProductsByPrice', { query, minPrice, maxPrice });
      try {
        // Convert string to number if needed
        const minP = typeof minPrice === 'string' ? parseInt(minPrice) : (minPrice || 0);
        const maxP = typeof maxPrice === 'string' ? parseInt(maxPrice) : (maxPrice || 100000000);
        
        const embedding = await generateEmbedding(`sản phẩm: ${query}`, env);
        if (!embedding.length || !env.VECTORIZE) {
          return { content: [{ type: 'text', text: JSON.stringify({ results: [], message: 'Không thể tìm kiếm lúc này.' }) }] };
        }
        const vectorResult = await env.VECTORIZE.query(embedding, { topK: 20, returnMetadata: 'all' });
        const results = (vectorResult?.matches ?? [])
          .filter((m: any) => {
            const price = Number(m.metadata?.price || 0);
            return price >= minP && price <= maxP;
          })
          .slice(0, 5)
          .map((m: any) => ({
            id: m.id,
            name: m.metadata?.name || '',
            brand: m.metadata?.brand || '',
            price: Number(m.metadata?.price || 0),
            category: m.metadata?.category || '',
          }));

        let message = `Không tìm thấy sản phẩm ${query} nào trong tầm giá này.`;
        if (results.length > 0) {
          const overview = results.slice(0, 3).map((r: any) => `${r.name} giá ${r.price.toLocaleString('vi-VN')} VND`).join(', ');
          message = `Tìm thấy ${results.length} sản phẩm ${query} trong tầm giá. Tiêu biểu: ${overview}.`;
        }
          
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              results,
              count: results.length,
              priceRange: { min: minPrice, max: maxPrice },
              message,
            })
          }]
        };
      } catch (e) {
        return { content: [{ type: 'text', text: JSON.stringify({ results: [], message: 'Lỗi lọc sản phẩm.' }) }] };
      }
    }
  );

  // 3. getProductDetails
  server.registerTool(
    'getProductDetails',
    {
      description: 'Lấy thông tin chi tiết về một sản phẩm cụ thể theo ID hoặc tên, bao gồm cả thông số kỹ thuật. Sử dụng khi người dùng hỏi về cấu hình, thông số hoặc chi tiết sản phẩm.',
      inputSchema: z.object({
        productId: z.string().optional().describe('ID sản phẩm từ danh sách đã hiển thị trước đó'),
        productName: z.string().optional().describe('Tên sản phẩm hoặc tham chiếu như "sản phẩm thứ 2" hoặc "iPhone Air"'),
      })
    },
    async ({ productId, productName }) => {
      log('info', 'tool.getProductDetails', { productId, productName });
      try {
        const product = await resolveProduct(productId, productName, env);

        if (!product) {
          return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: 'Không tìm thấy sản phẩm.' }) }] };
        }

        const specs = await fetchSpecs(product.id, env);

        const responsePayload: any = {
          success: true,
          product: {
            id: product.id,
            name: product.name,
            brand: product.brand,
            price: product.price,
            category: product.category,
            priceFormatted: product.price.toLocaleString('vi-VN') + ' VND',
          },
          action: 'product_details',
        };

        if (specs.length > 0) {
          responsePayload.product.specs = specs;
          responsePayload.message = `${product.name} - ${product.price.toLocaleString('vi-VN')} VND. Thông số kỹ thuật: ${specs.slice(0, 3).map((s: any) => s.label + ': ' + s.value).join(', ')}... Bạn muốn thêm vào giỏ hàng hay cần thêm thông tin gì không?`;
        } else {
          responsePayload.message = `${product.name} - ${product.price.toLocaleString('vi-VN')} VND. Bạn muốn thêm vào giỏ hàng hay cần thêm thông tin gì không?`;
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(responsePayload) }]
        };
      } catch (e) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: 'Lỗi lấy thông tin sản phẩm.' }) }] };
      }
    }
  );

  // 4. viewCart
  server.registerTool(
    'viewCart',
    {
      description: 'Xem nội dung hiện tại trong giỏ hàng của người dùng.',
      inputSchema: z.object({
        userId: z.string().describe('ID người dùng để lấy giỏ hàng'),
      })
    },
    async ({ userId }) => {
      const isValidId = userId && /^[a-zA-Z0-9_-]+$/.test(userId) && userId.length > 5;
      const uid = isValidId ? userId : ctxUserId;
      log('info', 'tool.viewCart', { userId: uid });
      try {
        if (!env.DB) {
          return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: 'Không thể truy cập giỏ hàng lúc này.' }) }] };
        }

        const { results } = await env.DB.prepare(
          `SELECT ci.product_id, ci.quantity, p.name, p.price, p.brand
           FROM cart_items ci JOIN products p ON ci.product_id = p.id
           WHERE ci.user_id = ?`
        ).bind(uid).all();

        const items = (results as any[]).map(row => ({
          productId: row.product_id,
          name: row.name,
          brand: row.brand || '',
          price: Number(row.price || 0),
          quantity: Number(row.quantity || 1),
          subtotal: Number(row.price || 0) * Number(row.quantity || 1),
        }));

        const total = items.reduce((sum, item) => sum + item.subtotal, 0);

        if (items.length === 0) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, items: [], total: 0, action: 'view_cart', message: 'Giỏ hàng của bạn đang trống.' }) }]
          };
        }

        const summary = items.map((item, i) => `${i + 1}. ${item.name} x${item.quantity} — ${item.subtotal.toLocaleString('vi-VN')} VND`).join(', ');
        const message = `Giỏ hàng có ${items.length} sản phẩm: ${summary}. Tổng cộng: ${total.toLocaleString('vi-VN')} VND.`;

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ success: true, items, total, itemCount: items.length, action: 'view_cart', message })
          }]
        };
      } catch (e) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: 'Không thể xem giỏ hàng. Vui lòng thử lại.' }) }] };
      }
    }
  );

  // 5. compareProducts
  server.registerTool(
    'compareProducts',
    {
      description: 'So sánh 2 hoặc nhiều sản phẩm cạnh nhau bao gồm đầy đủ thông số kỹ thuật. Sau khi nhận được kết quả từ công cụ, hãy cung cấp bản so sánh chi tiết các thông số chính (màn hình, chip, RAM, pin, camera) và đề xuất trường hợp sử dụng tốt nhất cho từng sản phẩm. Truyền sản phẩm dưới dạng mảng các đối tượng chứa tên hoặc ID sản phẩm. Ví dụ: [{"productName":"iPhone 17"},{"productName":"Samsung Galaxy S25"}]',
      inputSchema: z.object({
        products: z.union([
          z.array(z.object({
            productId: z.string().optional(),
            productName: z.string().optional(),
          })),
          z.string().transform(s =>
            s.split(/[,;]+/).map(p => p.trim()).filter(Boolean).map(p => ({ productName: p }))
          ),
        ]).describe('Các sản phẩm cần so sánh — mảng {productId?,productName?} hoặc danh sách tên cách nhau bằng dấu phẩy'),
      })
    },
    async ({ products }) => {
      try {
        const refs = Array.isArray(products) ? products : (products as any[]);
        const comparisons: any[] = [];
        for (const ref of refs.slice(0, 3)) {
          const resolved = await resolveProduct(
            (ref as any).productId,
            (ref as any).productName,
            env,
            lastSearchResults,
          );
          if (resolved) {
            const allSpecs = await fetchSpecs(resolved.id, env);
            comparisons.push({
              id: resolved.id,
              name: resolved.name,
              brand: resolved.brand,
              price: resolved.price,
              priceFormatted: resolved.price.toLocaleString('vi-VN') + ' VND',
              category: resolved.category,
              specs: allSpecs,
            });
          }
        }
        let message = 'Không đủ sản phẩm để so sánh.';
        if (comparisons.length >= 2) {
          const prompt = comparisons.map(p => {
            const specText = p.specs.length > 0
              ? p.specs.map((s: any) => `${s.label}: ${s.value}`).join('\n')
              : 'Không có thông số';
            return `${p.name} (${p.priceFormatted}):\n${specText}`;
          }).join('\n\n---\n\n');

          try {
            const glmResult = await (env.AI as any).run('@cf/zai-org/glm-4.7-flash', {
              messages: [
                { role: 'system', content: 'Bạn là tư vấn viên tại Thế Giới Di Động. So sánh các sản phẩm và gợi ý trường hợp sử dụng tốt nhất cho từng sản phẩm bằng tiếng Việt. Xưng hô với khách hàng là "Quý khách". Trả lời bằng văn xuôi thuần túy, KHÔNG dùng bảng, KHÔNG dùng markdown, KHÔNG dùng bullet points, KHÔNG dùng ký tự đặc biệt. QUAN TRỌNG: Toàn bộ câu trả lời CHỈ được phép có đúng 4 câu.' },
                { role: 'user', content: prompt }
              ]
            });
            message = glmResult?.choices?.[0]?.message?.content || glmResult?.response || comparisons.map(p => p.name).join(' vs ');
          } catch {
            message = comparisons.map(p => `${p.name} (${p.priceFormatted})`).join(' vs ');
          }
        }
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              products: comparisons,
              count: comparisons.length,
              action: 'compare',
              message,
            })
          }]
        };
      } catch (e) {
        return { content: [{ type: 'text', text: JSON.stringify({ products: [], message: 'Lỗi so sánh sản phẩm.' }) }] };
      }
    }
  );

  // 4. addToCart
  server.registerTool(
    'addToCart',
    {
      description: 'Thêm sản phẩm vào giỏ hàng.',
      inputSchema: z.object({
        productName: z.string().optional().describe('Tên sản phẩm nếu được người dùng chỉ định'),
        productId: z.string().optional().describe('ID sản phẩm cần thêm'),
        quantity: z.union([z.number().int(), z.string()]).default(1).describe('Số lượng cần thêm'),
        userId: z.string().optional().describe('ID người dùng nếu có'),
      })
    },
    async ({ productName, productId, quantity, userId }) => {
      const uid = userId || ctxUserId;
      log('info', 'tool.addToCart', { productName, productId, quantity, userId: uid });
      try {
        const qty = typeof quantity === 'string' ? parseInt(quantity) || 1 : (quantity || 1);
        const product = await resolveProduct(productId, productName, env);

        if (!product || !product.id) {
          return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: 'Không tìm thấy sản phẩm. Vui lòng nói tên sản phẩm rõ hơn.' }) }] };
        }

        if (uid && env.DB) {
          try {
            const { results } = await env.DB.prepare('SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?')
               .bind(uid, product.id).all();

            if (results.length > 0) {
              const item = results[0] as any;
              await env.DB.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').bind(item.quantity + quantity, item.id).run();
            } else {
              await env.DB.prepare('INSERT INTO cart_items (id, user_id, product_id, quantity, created_at) VALUES (?, ?, ?, ?, ?)')
                .bind(crypto.randomUUID(), uid, product.id, quantity, new Date().toISOString()).run();
            }
          } catch (dbErr) {
             console.error('D1 cart insert error', dbErr);
          }
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              product,
              quantity: qty,
              action: 'add_to_cart',
              message: `Đã thêm ${qty > 1 ? qty + ' ' : ''}${product.name} vào giỏ hàng!`,
            })
          }]
        };
      } catch (e) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: 'Không thể thêm vào giỏ hàng. Vui lòng thử lại.' }) }] };
      }
    }
  );

  // 5. removeFromCart
  server.registerTool(
    'removeFromCart',
    {
      description: 'Xóa sản phẩm khỏi giỏ hàng.',
      inputSchema: z.object({
        productName: z.string().optional().describe('Tên sản phẩm cần xóa'),
        productId: z.string().optional().describe('ID sản phẩm cần xóa'),
        userId: z.string().optional().describe('ID người dùng'),
      })
    },
    async ({ productName, productId, userId }) => {
      const uid = userId || ctxUserId;
      log('info', 'tool.removeFromCart', { productName, productId, userId: uid });
      try {
        const product = await resolveProduct(productId, productName, env);
        
        if (!product || !product.id || !uid || !env.DB) {
          return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: 'Không tìm thấy sản phẩm trong giỏ hàng.' }) }] };
        }
        
        await env.DB.prepare('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?').bind(uid, product.id).run();
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              action: 'remove_from_cart',
              productId: product.id,
              message: `Đã xóa ${product.name} khỏi giỏ hàng.`,
            })
          }]
        };
      } catch (e) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: 'Không thể xóa sản phẩm. Vui lòng thử lại.' }) }] };
      }
    }
  );

  // 6. startCheckout
  server.registerTool(
    'startCheckout',
    {
      description: 'Bắt đầu quy trình thanh toán. Đọc giỏ hàng của người dùng và tạo đơn hàng nháp.',
      inputSchema: z.object({ userId: z.string().optional().describe('ID người dùng để đọc giỏ hàng') })
    },
    async ({ userId }) => {
      try {
        let cartItems: any[] = [];
        let totalPrice = 0;

        if (userId && env.DB) {
          const { results } = await env.DB.prepare(
            `SELECT ci.id, ci.product_id, ci.quantity, p.name, p.price, p.brand
             FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.user_id = ?`
          ).bind(userId).all();
          cartItems = results as any[];
          totalPrice = cartItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
        }

        if (cartItems.length === 0) {
          return { content: [{ type: 'text', text: JSON.stringify({ success: false, action: 'checkout_start', message: 'Giỏ hàng của bạn đang trống.' }) }] };
        }

        const orderId = crypto.randomUUID();
        const now = new Date().toISOString();
        const orderItems = cartItems.map((item: any) => ({
          productId: item.product_id, name: item.name, brand: item.brand, price: item.price, quantity: item.quantity,
        }));

        if (userId && env.DB) {
          await env.DB.prepare('INSERT INTO orders (id, user_id, status, total_price, items, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .bind(orderId, userId, 'confirmed', totalPrice, JSON.stringify(orderItems), now, now).run();
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true, action: 'checkout_start', orderId, totalPrice, items: orderItems, itemCount: cartItems.length,
              message: `Đơn hàng #${orderId.slice(0, 8).toUpperCase()} đã được tạo! Tổng cộng: ${totalPrice.toLocaleString('vi-VN')} VND.`,
            })
          }]
        };
      } catch (e) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, action: 'checkout_start', message: 'Không thể tạo đơn hàng.' }) }] };
      }
    }
  );

  // 7. getOrderStatus
  server.registerTool(
    'getOrderStatus',
    {
      description: 'Tra cứu trạng thái của một đơn hàng.',
      inputSchema: z.object({
        orderId: z.string().optional().describe('Mã đơn hàng hoặc mã code'),
        userId: z.string().optional().describe('ID người dùng để liệt kê tất cả đơn hàng'),
      })
    },
    async ({ orderId, userId }) => {
      const isValidId = userId && /^[a-zA-Z0-9_-]+$/.test(userId) && userId.length > 5;
      const uid = isValidId ? userId : ctxUserId;
      log('info', 'tool.getOrderStatus', { orderId, userId: uid });
      try {
        if (!env.DB) return { content: [{ type: 'text', text: JSON.stringify({ orders: [], message: 'Lỗi tra cứu.' }) }] };

        if (orderId) {
          const { results } = await env.DB.prepare('SELECT id, status, total_price, items, created_at FROM orders WHERE id LIKE ?').bind(`%${orderId}%`).all();
          if (!results.length) return { content: [{ type: 'text', text: JSON.stringify({ orders: [], message: `Không tìm thấy đơn hàng mã "${orderId}".` }) }] };

          const order = results[0] as any;
          const statusMap: Record<string, string> = { pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', shipped: 'Đang vận chuyển', delivered: 'Đã giao hàng' };
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                orders: results,
                order: { ...order, statusText: statusMap[order.status] || order.status },
                action: 'order_status',
                message: `Đơn hàng #${order.id.slice(0, 8).toUpperCase()}: ${statusMap[order.status] || order.status}`,
              })
            }]
          };
        }

        if (uid) {
          const { results } = await env.DB.prepare('SELECT id, status, total_price, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 5').bind(uid).all();
          return {
             content: [{
               type: 'text', text: JSON.stringify({
                 orders: results, action: 'order_status',
                 message: results.length ? `Bạn có ${results.length} đơn hàng gần đây.` : 'Bạn chưa có đơn hàng nào.'
               })
             }]
          };
        }
        return { content: [{ type: 'text', text: JSON.stringify({ orders: [], action: 'order_status', message: 'Vui lòng cung cấp mã đơn hàng.' }) }] };
      } catch (e) {
        return { content: [{ type: 'text', text: JSON.stringify({ orders: [], message: 'Lỗi hệ thống.' }) }] };
      }
    }
  );

  // 8. cancelOrder
  server.registerTool(
    'cancelOrder',
    {
      description: 'Hủy một đơn hàng đang chờ hoặc đã xác nhận cho người dùng.',
      inputSchema: z.object({
        orderId: z.string().describe('ID đơn hàng hoặc mã ngắn để hủy'),
        userId: z.string().optional().describe('ID người dùng để xác minh quyền sở hữu'),
      })
    },
    async ({ orderId, userId }) => {
      log('info', 'tool.cancelOrder', { orderId, userId });
      try {
        if (!env.DB) {
          return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: 'Không thể hủy đơn hàng lúc này.' }) }] };
        }

        const { results } = await env.DB.prepare(
          'SELECT id, status, user_id FROM orders WHERE id LIKE ?'
        ).bind(`%${orderId}%`).all();

        if (!results.length) {
          return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: `Không tìm thấy đơn hàng mã "${orderId}".` }) }] };
        }

        const order = results[0] as any;

        if (userId && order.user_id !== userId) {
          return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: 'Bạn không có quyền hủy đơn hàng này.' }) }] };
        }

        const nonCancellableStatuses = ['shipped', 'delivered', 'cancelled'];
        if (nonCancellableStatuses.includes(order.status)) {
          const statusMap: Record<string, string> = { shipped: 'đang vận chuyển', delivered: 'đã giao hàng', cancelled: 'đã hủy trước đó' };
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: false, message: `Đơn hàng #${order.id.slice(0, 8).toUpperCase()} không thể hủy vì ${statusMap[order.status]}.` }) }]
          };
        }

        await env.DB.prepare(
          'UPDATE orders SET status = ?, updated_at = ? WHERE id = ?'
        ).bind('cancelled', new Date().toISOString(), order.id).run();

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              orderId: order.id,
              action: 'cancel_order',
              message: `Đơn hàng #${order.id.slice(0, 8).toUpperCase()} đã được hủy thành công.`,
            })
          }]
        };
      } catch (e) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: 'Không thể hủy đơn hàng. Vui lòng thử lại.' }) }] };
      }
    }
  );

  // 9. getFaqAnswer
  server.registerTool(
    'getFaqAnswer',
    {
      description: 'Trả lời các câu hỏi thường gặp về chính sách của cửa hàng.',
      inputSchema: z.object({ question: z.string().describe('Câu hỏi FAQ') })
    },
    async ({ question }) => {
      try {
        if (!env.VECTORIZE_FAQ) return { content: [{ type: 'text', text: JSON.stringify({ answer: 'Vui lòng gọi 1800 2091.' }) }] };
        const embedding = await generateEmbedding(question, env);
        if (!embedding.length) return { content: [{ type: 'text', text: JSON.stringify({ answer: 'Lỗi.' }) }] };

        const result = await env.VECTORIZE_FAQ.query(embedding, { topK: 1, returnMetadata: 'all' });
        const best = result?.matches?.[0];
        if (best?.score && best.score >= 0.45 && best.metadata?.answer) {
          return { content: [{ type: 'text', text: JSON.stringify({ answer: best.metadata.answer, action: 'faq' }) }] };
        }
        return { content: [{ type: 'text', text: JSON.stringify({ answer: 'Không tìm thấy câu trả lời, gọi 1800 2091.', action: 'faq' }) }] };
      } catch (e) {
        return { content: [{ type: 'text', text: JSON.stringify({ answer: 'Lỗi FAQ.' }) }] };
      }
    }
  );

  // 9. createSupportTicket
  server.registerTool(
    'createSupportTicket',
    {
      description: 'Tạo một phiếu hỗ trợ khách hàng.',
      inputSchema: z.object({
        category: z.enum(['product_issue', 'delivery', 'payment', 'return_exchange', 'warranty', 'other']).describe('Danh mục yêu cầu hỗ trợ'),
        message: z.string().describe('Mô tả vấn đề'),
        userId: z.string().optional().describe('ID người dùng'),
      })
    },
    async ({ category, message, userId }) => {
      try {
        const ticketId = crypto.randomUUID();
        if (env.DB) {
          await env.DB.prepare('INSERT INTO support_tickets (id, user_id, category, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
            .bind(ticketId, userId || null, category, message, 'open', new Date().toISOString()).run();
        }
        return {
           content: [{
             type: 'text',
             text: JSON.stringify({
               success: true, ticketId, category, action: 'create_ticket',
               message: `Đã ghi nhận yêu cầu hỗ trợ #${ticketId.slice(0, 8).toUpperCase()}.`,
             })
           }]
        };
      } catch (e) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: 'Lỗi tạo ticket.' }) }] };
      }
    }
  );

  return server;
}
