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

async function resolveProduct(productId: string | undefined, productName: string | undefined, env: Env): Promise<{id: string; name: string; brand: string; price: number; category: string} | null> {
  const searchTerm = productName || productId || '';
  if (!searchTerm) return null;
  
  const embedding = await generateEmbedding(searchTerm, env);
  if (!embedding.length || !env.VECTORIZE) return null;
  
  const result = await env.VECTORIZE.query(embedding, { topK: 10, returnMetadata: 'all' });
  const matches = result?.matches || [];
  
  if (matches.length === 0) return null;
  
  let match = null;
  
  // Priority 1: Exact ID match
  if (productId && productId !== 'null' && productId.trim() !== '') {
    match = matches.find((m: any) => m.id === productId);
  }
  
  // Priority 2: Partial name match (case-insensitive)
  if (!match && productName) {
    const searchLower = productName.toLowerCase();
    match = matches.find((m: any) => 
      m.metadata?.name?.toLowerCase().includes(searchLower) ||
      searchLower.includes(m.metadata?.name?.toLowerCase())
    );
  }
  
  // Priority 3: Best semantic match (any of top 3 results with score > 0.7)
  if (!match) {
    for (const m of matches.slice(0, 3)) {
      if ((m.score || 0) > 0.7 && m.metadata?.name) {
        match = m;
        break;
      }
    }
  }
  
  // Priority 4: Just take the top result if scores are lower but we have matches
  if (!match && matches[0]?.metadata?.name) {
    match = matches[0];
  }
  
  if (match?.metadata?.name) {
    return {
      id: match.id,
      name: match.metadata.name,
      brand: match.metadata.brand || '',
      price: Number(match.metadata.price || 0),
      category: match.metadata.category || '',
    };
  }
  
  return null;
}

// Factory function to create the MCP server bound to the current Cloudflare environment
export function createCommerceMcpServer(env: Env) {
  const server = new McpServer({
    name: 'TGDD VoiceCommerce MCP Server',
    version: '2.0.0',
  });

  // 1. searchProducts
  server.registerTool(
    'searchProducts',
    {
      description: 'Search for products in the TGDD catalog by name, model, or category.',
      inputSchema: z.object({
        query: z.string().describe('Product name, model, or category in Vietnamese or English'),
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
      description: 'Search products within a price range.',
      inputSchema: z.object({
        query: z.string().describe('Product type or name'),
        minPrice: z.union([z.number(), z.string()]).optional().describe('Minimum price in VND'),
        maxPrice: z.union([z.number(), z.string()]).optional().describe('Maximum price in VND'),
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
      description: 'Get detailed information about a specific product by ID or name, including specs. Use this when the user asks about product configuration, specs, or details.',
      inputSchema: z.object({
        productId: z.string().optional().describe('Product ID from the previously shown list'),
        productName: z.string().optional().describe('Product name or reference such as "sản phẩm thứ 2" or "iPhone Air"'),
      })
    },
    async ({ productId, productName }) => {
      log('info', 'tool.getProductDetails', { productId, productName });
      try {
        const product = await resolveProduct(productId, productName, env);

        if (!product) {
          return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: 'Không tìm thấy sản phẩm.' }) }] };
        }

        // Fetch specs from DB if available
        let specs: any[] = [];
        if (product.id && env.DB) {
          try {
            const { results } = await env.DB.prepare(
              'SELECT specs FROM products WHERE id = ?'
            ).bind(product.id).all();
            if (results.length > 0 && (results[0] as any).specs) {
              let specsStr = (results[0] as any).specs;
              // Handle double-encoded JSON: Unicode escape sequences like \u00e0 stored literally
              try {
                specs = JSON.parse(specsStr);
              } catch {
                try {
                  const decoded = specsStr.replace(/\\u([0-9a-fA-F]{4})/g, (match: string, code: string) => 
                    String.fromCharCode(parseInt(code, 16))
                  );
                  specs = JSON.parse(decoded);
                } catch {
                  specs = [];
                }
              }
            }
          } catch (e) {
            log('warn', 'getProductDetails.specs', { error: String(e) });
          }
        }

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
          responsePayload.message = `${product.name} - ${product.price.toLocaleString('vi-VN')} VND. Thông số kỹ thuật: ${specs.slice(0, 3).map((s: any) => s.name + ': ' + s.value).join(', ')}... Bạn muốn thêm vào giỏ hàng hay cần thêm thông tin gì không?`;
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
      description: 'View the current contents of the user\'s shopping cart.',
      inputSchema: z.object({
        userId: z.string().describe('User ID to retrieve cart for'),
      })
    },
    async ({ userId }) => {
      log('info', 'tool.viewCart', { userId });
      try {
        if (!env.DB) {
          return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: 'Không thể truy cập giỏ hàng lúc này.' }) }] };
        }

        const { results } = await env.DB.prepare(
          `SELECT ci.product_id, ci.quantity, p.name, p.price, p.brand
           FROM cart_items ci JOIN products p ON ci.product_id = p.id
           WHERE ci.user_id = ?`
        ).bind(userId).all();

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
      description: 'Compare 2 or more products side-by-side. Accepts product names, IDs, or a mix of both.',
      inputSchema: z.object({
        products: z.array(z.object({
          productId: z.string().optional().describe('Product ID from the previously shown list'),
          productName: z.string().optional().describe('Product name'),
        })).min(2).describe('List of products to compare (by ID or name)'),
      })
    },
    async ({ products }) => {
      try {
        const comparisons = [];
        for (const ref of products.slice(0, 3)) {
          const resolved = await resolveProduct(ref.productId, ref.productName, env);
          if (resolved) comparisons.push(resolved);
        }
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              products: comparisons,
              count: comparisons.length,
              action: 'compare',
              message: comparisons.length >= 2
                ? `So sánh ${comparisons.map(p => p.name).join(' và ')}`
                : 'Không đủ sản phẩm để so sánh.',
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
      description: 'Add a product to the shopping cart.',
      inputSchema: z.object({
        productName: z.string().optional().describe('Product name if specified by user'),
        productId: z.string().optional().describe('Product ID to add'),
        quantity: z.union([z.number().int(), z.string()]).default(1).describe('Quantity to add'),
        userId: z.string().optional().describe('User ID if available'),
      })
    },
    async ({ productName, productId, quantity, userId }) => {
      log('info', 'tool.addToCart', { productName, productId, quantity, userId });
      try {
        const qty = typeof quantity === 'string' ? parseInt(quantity) || 1 : (quantity || 1);
        const product = await resolveProduct(productId, productName, env);

        if (!product || !product.id) {
          return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: 'Không tìm thấy sản phẩm. Vui lòng nói tên sản phẩm rõ hơn.' }) }] };
        }

        if (userId && env.DB) {
          try {
            const { results } = await env.DB.prepare('SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?')
               .bind(userId, product.id).all();

            if (results.length > 0) {
              const item = results[0] as any;
              await env.DB.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').bind(item.quantity + quantity, item.id).run();
            } else {
              await env.DB.prepare('INSERT INTO cart_items (id, user_id, product_id, quantity, created_at) VALUES (?, ?, ?, ?, ?)')
                .bind(crypto.randomUUID(), userId, product.id, quantity, new Date().toISOString()).run();
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
      description: 'Remove a product from the shopping cart.',
      inputSchema: z.object({
        productName: z.string().optional().describe('Product name to remove'),
        productId: z.string().optional().describe('Product ID to remove'),
        userId: z.string().optional().describe('User ID'),
      })
    },
    async ({ productName, productId, userId }) => {
      log('info', 'tool.removeFromCart', { productName, productId, userId });
      try {
        const product = await resolveProduct(productId, productName, env);
        
        if (!product || !product.id || !userId || !env.DB) {
          return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: 'Không tìm thấy sản phẩm trong giỏ hàng.' }) }] };
        }
        
        await env.DB.prepare('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?').bind(userId, product.id).run();
        
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
      description: 'Start the checkout process. Reads the user\'s cart, creates a draft order.',
      inputSchema: z.object({ userId: z.string().optional().describe('User ID to read cart from') })
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
      description: 'Look up the status of an order.',
      inputSchema: z.object({
        orderId: z.string().optional().describe('Order ID or order code'),
        userId: z.string().optional().describe('User ID to list all orders'),
      })
    },
    async ({ orderId, userId }) => {
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

        if (userId) {
          const { results } = await env.DB.prepare('SELECT id, status, total_price, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 5').bind(userId).all();
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
      description: 'Cancel a pending or confirmed order for the user.',
      inputSchema: z.object({
        orderId: z.string().describe('The order ID or short code to cancel'),
        userId: z.string().optional().describe('User ID for ownership verification'),
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
      description: 'Answer frequently asked questions about store policies.',
      inputSchema: z.object({ question: z.string().describe('The FAQ question') })
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
      description: 'Create a customer support ticket.',
      inputSchema: z.object({
        category: z.enum(['product_issue', 'delivery', 'payment', 'return_exchange', 'warranty', 'other']).describe('Ticket category'),
        message: z.string().describe('Description of the issue'),
        userId: z.string().optional().describe('User ID'),
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
