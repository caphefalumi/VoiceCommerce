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
        category: z.string().optional().describe('Optional category filter: điện thoại, laptop, tablet, tai nghe, đồng hồ'),
      })
    },
    async ({ query, category }) => {
      log('info', 'tool.searchProducts', { query, category });
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
          score: m.score,
        }));
        if (category) {
          results = results.filter((r: any) => r.category.toLowerCase().includes(category.toLowerCase()));
        }
        results = results.slice(0, 5);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              results,
              count: results.length,
              message: results.length > 0 ? `Tìm thấy ${results.length} sản phẩm phù hợp với "${query}"` : `Không tìm thấy sản phẩm nào cho "${query}"`,
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
          
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              results,
              count: results.length,
              priceRange: { min: minPrice, max: maxPrice },
              message: `Tìm thấy ${results.length} sản phẩm ${query} thỏa điều kiện giá.`
            })
          }]
        };
      } catch (e) {
        return { content: [{ type: 'text', text: JSON.stringify({ results: [], message: 'Lỗi lọc sản phẩm.' }) }] };
      }
    }
  );

  // 3. compareProducts
  server.registerTool(
    'compareProducts',
    {
      description: 'Compare 2 or more products side-by-side.',
      inputSchema: z.object({ productNames: z.array(z.string()).min(2).describe('List of product names to compare') })
    },
    async ({ productNames }) => {
      try {
        const comparisons = [];
        for (const name of productNames.slice(0, 3)) {
          const embedding = await generateEmbedding(`sản phẩm: ${name}`, env);
          if (embedding.length && env.VECTORIZE) {
            const result = await env.VECTORIZE.query(embedding, { topK: 1, returnMetadata: 'all' });
            const match = result?.matches?.[0];
            if (match?.metadata?.name) {
              comparisons.push({
                id: match.id,
                name: match.metadata.name,
                brand: match.metadata.brand || '',
                price: Number(match.metadata.price || 0),
                category: match.metadata.category || '',
              });
            }
          }
        }
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              products: comparisons,
              count: comparisons.length,
              message: comparisons.length >= 2 ? `So sánh ${comparisons.map(p => p.name).join(' và ')}` : 'Không đủ sản phẩm để so sánh.'
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
        // Convert quantity to number if string
        const qty = typeof quantity === 'string' ? parseInt(quantity) || 1 : (quantity || 1);
        let product: any = null;

        if (productId) {
           product = { id: productId, name: productName || 'Sản phẩm' };
        } else if (productName) {
          const embedding = await generateEmbedding(`sản phẩm: ${productName}`, env);
          if (embedding.length && env.VECTORIZE) {
            const result = await env.VECTORIZE.query(embedding, { topK: 1, returnMetadata: 'all' });
            const match = result?.matches?.[0];
            if (match?.metadata?.name) {
              product = {
                id: match.id,
                name: match.metadata.name,
                brand: match.metadata.brand || '',
                price: Number(match.metadata.price || 0),
                category: match.metadata.category || '',
              };
            }
          }
        }

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
        let removedName = productName || 'sản phẩm';
        if (userId && env.DB && (productId || productName)) {
          if (productId) {
            await env.DB.prepare('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?').bind(userId, productId).run();
          } else if (productName) {
            const embedding = await generateEmbedding(`sản phẩm: ${productName}`, env);
            if (embedding.length && env.VECTORIZE) {
              const result = await env.VECTORIZE.query(embedding, { topK: 1, returnMetadata: 'all' });
              const match = result?.matches?.[0];
              if (match?.id) {
                removedName = (match.metadata?.name as string) || productName;
                await env.DB.prepare('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?').bind(userId, match.id).run();
              }
            }
          }
        }
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              action: 'remove_from_cart',
              message: `Đã xóa ${removedName} khỏi giỏ hàng.`,
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

  // 8. getFaqAnswer
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
