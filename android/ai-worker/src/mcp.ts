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

type CartCheckoutItem = {
  productId: string;
  name: string;
  brand: string;
  price: number;
  quantity: number;
  subtotal: number;
};

type DeliveryInfo = {
  recipientName: string;
  phone: string;
  address: string;
  city: string;
};

type ProductSpec = {
  label: string;
  value: string;
};

function normalizeSpecs(rawSpecs: unknown): ProductSpec[] {
  if (!Array.isArray(rawSpecs)) return [];
  return rawSpecs
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
      const labelRaw =
        typeof record.label === 'string'
          ? record.label.trim()
          : typeof record.key === 'string'
            ? record.key.trim()
            : '';
      const valueRaw = typeof record.value === 'string' ? record.value.trim() : '';

      const label = labelRaw.replace(/:+\s*$/g, '').replace(/\s{2,}/g, ' ').trim();
      const value = valueRaw.replace(/^:+\s*/g, '').replace(/\s{2,}/g, ' ').trim();
      if (!label || !value) return null;

      const normalizeText = (v: string) => v.toLowerCase().replace(/[:\s]+/g, ' ').trim();
      if (normalizeText(label) === normalizeText(value)) return null;

      return { label, value };
    })
    .filter((spec): spec is ProductSpec => spec !== null);
}

function isLowValueSpec(spec: ProductSpec): boolean {
  const combined = `${spec.label} ${spec.value}`.toLowerCase();
  return (
    combined.includes('brand not disclosed') ||
    combined.includes('not disclosed') ||
    combined.includes('contacts') ||
    combined.includes('remaining capacity') ||
    combined.includes('not disclosed') ||
    combined.includes('n/a')
  );
}

function normalizeBrand(brand: string): string {
  const b = (brand || '').trim();
  const lower = b.toLowerCase();
  if (!b) return '';
  if (lower.includes('brand not disclosed') || lower.includes('not disclosed') || lower === 'n/a') {
    return '';
  }
  return b;
}

function resolveOrdinal(text: string): number | null {
  const t = text.toLowerCase().trim();
  const wordMap: Record<string, number> = {
    'first': 1, 'one': 1, '1': 1,
    'second': 2, 'two': 2, '2': 2,
    'third': 3, 'three': 3, '3': 3,
    'fourth': 4, 'four': 4, '4': 4,
    'fifth': 5, 'five': 5, '5': 5,
  };
  const m = t.match(/(?:number\s+|no\.?\s*)(\S+)/);
  if (m) return wordMap[m[1]] ?? null;
  if (/first/.test(t)) return 1;
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

function isCompleteDeliveryInfo(info: DeliveryInfo | null): info is DeliveryInfo {
  if (!info) return false;
  return Boolean(
    info.recipientName.trim() &&
      info.phone.trim() &&
      info.address.trim() &&
      info.city.trim(),
  );
}

function formatCartSummary(items: CartCheckoutItem[], totalPrice: number): string {
  const lines = items.map(
    (item, idx) =>
      `${idx + 1}. ${item.name} x${item.quantity} — ${item.subtotal.toLocaleString('en-US')} VND`,
  );
  return `${lines.join('; ')}. Total: ${totalPrice.toLocaleString('en-US')} VND.`;
}

async function getCartForCheckout(env: Env, userId: string): Promise<{ items: CartCheckoutItem[]; totalPrice: number }> {
  if (!env.DB || !userId) return { items: [], totalPrice: 0 };
  const { results } = await env.DB
    .prepare(
      `SELECT ci.product_id, ci.quantity, p.name, p.price, p.brand
       FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.user_id = ?`,
    )
    .bind(userId)
    .all();

  const items = (results as Array<Record<string, unknown>>).map((row) => {
    const price = Number(row.price || 0);
    const quantity = Number(row.quantity || 1);
    return {
      productId: String(row.product_id || ''),
      name: String(row.name || ''),
      brand: String(row.brand || ''),
      price,
      quantity,
      subtotal: price * quantity,
    };
  });
  const totalPrice = items.reduce((sum, item) => sum + item.subtotal, 0);
  return { items, totalPrice };
}

async function getUserDeliveryInfo(env: Env, userId: string): Promise<DeliveryInfo | null> {
  if (!env.DB || !userId) return null;
  try {
    const { results } = await env.DB
      .prepare(
        `SELECT name, delivery_recipient_name, delivery_phone, delivery_address, delivery_city
         FROM "user" WHERE id = ?`,
      )
      .bind(userId)
      .all();

    if (!results.length) return null;
    const row = results[0] as Record<string, unknown>;
    return {
      recipientName: String(row.delivery_recipient_name || row.name || ''),
      phone: String(row.delivery_phone || ''),
      address: String(row.delivery_address || ''),
      city: String(row.delivery_city || ''),
    };
  } catch {
    return null;
  }
}

async function upsertUserDeliveryInfo(env: Env, userId: string, delivery: DeliveryInfo): Promise<void> {
  if (!env.DB || !userId) return;
  await env.DB
    .prepare(
      `UPDATE "user"
       SET delivery_recipient_name = ?,
           delivery_phone = ?,
           delivery_address = ?,
           delivery_city = ?,
           updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      delivery.recipientName,
      delivery.phone,
      delivery.address,
      delivery.city,
      Date.now(),
      userId,
    )
    .run();
}

async function createOrderFromCart(env: Env, userId: string, items: CartCheckoutItem[], totalPrice: number, delivery: DeliveryInfo) {
  const orderId = crypto.randomUUID();
  const now = new Date().toISOString();
  const orderItems = items.map((item) => ({
    productId: item.productId,
    name: item.name,
    brand: item.brand,
    price: item.price,
    quantity: item.quantity,
  }));

  if (env.DB) {
    await env.DB
      .prepare(
        `INSERT INTO orders (id, user_id, status, total_price, items, shipping_address, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        orderId,
        userId,
        'confirmed',
        totalPrice,
        JSON.stringify(orderItems),
        JSON.stringify({
          name: delivery.recipientName,
          phone: delivery.phone,
          address: delivery.address,
          city: delivery.city,
        }),
        now,
        now,
      )
      .run();

    await env.DB.prepare('DELETE FROM cart_items WHERE user_id = ?').bind(userId).run();
  }

  return { orderId, orderItems };
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
      description: 'Search products in the TGDD catalog by name, model, or category.',
      inputSchema: z.object({
        query: z.string().describe('Product name, model, or category in English'),
      })
    },
    async ({ query }) => {
      log('info', 'tool.searchProducts', { query });
      try {
        const embedding = await generateEmbedding(`product: ${query}`, env);
        if (!embedding.length || !env.VECTORIZE) {
          return { content: [{ type: 'text', text: JSON.stringify({ results: [], message: 'Search is unavailable right now.' }) }] };
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
        
        let message = `No products found for "${query}".`;
        if (results.length > 0) {
          message = `Found some matching products for "${query}".`;
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
        return { content: [{ type: 'text', text: JSON.stringify({ results: [], message: 'Search error. Please try again.' }) }] };
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
        
        const embedding = await generateEmbedding(`product: ${query}`, env);
        if (!embedding.length || !env.VECTORIZE) {
          return { content: [{ type: 'text', text: JSON.stringify({ results: [], message: 'Search is unavailable right now.' }) }] };
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

        let message = `No ${query} products found in this price range.`;
        if (results.length > 0) {
          message = `Found some ${query} products in the requested price range.`;
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
        return { content: [{ type: 'text', text: JSON.stringify({ results: [], message: 'Product filtering error.' }) }] };
      }
    }
  );

  // 3. getProductDetails
  server.registerTool(
    'getProductDetails',
    {
      description: 'Get detailed information for a specific product by ID or name, including technical specifications.',
      inputSchema: z.object({
        productId: z.string().optional().describe('Product ID from a previously shown list'),
        productName: z.string().optional().describe('Product name or reference like "product number 2" or "iPhone Air"'),
      })
    },
    async ({ productId, productName }) => {
      log('info', 'tool.getProductDetails', { productId, productName });
      try {
        const product = await resolveProduct(productId, productName, env);

        if (!product) {
          return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: 'Product not found.' }) }] };
        }

        const rawSpecs = await fetchSpecs(product.id, env);
        const specs = normalizeSpecs(rawSpecs).filter((spec) => !isLowValueSpec(spec));

        const responsePayload: any = {
          success: true,
          product: {
            id: product.id,
            name: product.name,
            brand: normalizeBrand(product.brand),
            price: product.price,
            category: product.category,
            priceFormatted: product.price.toLocaleString('en-US') + ' VND',
          },
          action: 'product_details',
        };

        if (specs.length > 0) {
          responsePayload.product.specs = specs;
          responsePayload.product.specCount = specs.length;
        }
        responsePayload.message = 'Product details retrieved successfully.';

        return {
          content: [{ type: 'text', text: JSON.stringify(responsePayload) }]
        };
      } catch (e) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: 'Error retrieving product details.' }) }] };
      }
    }
  );

  // 4. viewCart
  server.registerTool(
    'viewCart',
    {
      description: 'View the current contents of the user cart.',
      inputSchema: z.object({
        userId: z.string().describe('User ID to load cart items'),
      })
    },
    async ({ userId }) => {
      const isValidId = userId && /^[a-zA-Z0-9_-]+$/.test(userId) && userId.length > 5;
      const uid = isValidId ? userId : ctxUserId;
      log('info', 'tool.viewCart', { userId: uid });
      try {
        if (!env.DB) {
          return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: 'Cannot access the cart right now.' }) }] };
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
            content: [{ type: 'text', text: JSON.stringify({ success: true, items: [], total: 0, action: 'view_cart', message: 'Your cart is empty.' }) }]
          };
        }

        const summary = items.map((item, i) => `${i + 1}. ${item.name} x${item.quantity} — ${item.subtotal.toLocaleString('en-US')} VND`).join(', ');
        const message = `Your cart has ${items.length} product(s): ${summary}. Total: ${total.toLocaleString('en-US')} VND.`;

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ success: true, items, total, itemCount: items.length, action: 'view_cart', message })
          }]
        };
      } catch (e) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: 'Unable to view cart. Please try again.' }) }] };
      }
    }
  );

  // 5. compareProducts
  server.registerTool(
    'compareProducts',
    {
      description: 'Compare 2 or more products side by side with full technical specifications. After getting results, provide a detailed comparison of key specs (screen, chip, RAM, battery, camera) and suggest the best use case for each product. Pass products as an array of objects with product name or ID. Example: [{"productName":"iPhone 17"},{"productName":"Samsung Galaxy S25"}]',
      inputSchema: z.object({
        products: z.union([
          z.array(z.object({
            productId: z.string().optional(),
            productName: z.string().optional(),
          })),
          z.string().transform(s =>
            s.split(/[,;]+/).map(p => p.trim()).filter(Boolean).map(p => ({ productName: p }))
          ),
        ]).describe('Products to compare — array {productId?,productName?} or comma-separated product names'),
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
              priceFormatted: resolved.price.toLocaleString('en-US') + ' VND',
              category: resolved.category,
              specs: allSpecs,
            });
          }
        }
        let message = 'Not enough products to compare.';
        if (comparisons.length >= 2) {
          const prompt = comparisons.map(p => {
            const specText = p.specs.length > 0
              ? p.specs.map((s: any) => `${s.label}: ${s.value}`).join('\n')
              : 'No specifications available';
            return `${p.name} (${p.priceFormatted}):\n${specText}`;
          }).join('\n\n---\n\n');

          try {
            const glmResult = await (env.AI as any).run('@cf/zai-org/glm-4.7-flash', {
              messages: [
                { role: 'system', content: 'You are a sales consultant at TGDD. Compare products and suggest the best use case for each product in English. Address the customer as "Dear customer". Reply in plain prose only, NO tables, NO markdown, NO bullet points, and NO special characters. IMPORTANT: The full response must be exactly 4 sentences.' },
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
        return { content: [{ type: 'text', text: JSON.stringify({ products: [], message: 'Product comparison error.' }) }] };
      }
    }
  );

  // 4. addToCart
  server.registerTool(
    'addToCart',
    {
      description: 'Add a product to the cart.',
      inputSchema: z.object({
        productName: z.string().optional().describe('Product name if explicitly provided by the user'),
        productId: z.string().optional().describe('Product ID to add'),
        quantity: z.union([z.number().int(), z.string()]).default(1).describe('Quantity to add'),
        userId: z.string().optional().describe('User ID if available'),
      })
    },
    async ({ productName, productId, quantity, userId }) => {
      const uid = userId || ctxUserId;
      log('info', 'tool.addToCart', { productName, productId, quantity, userId: uid });
      try {
        const parsedQty = typeof quantity === 'string' ? parseInt(quantity, 10) : quantity;
        const qty = Number.isFinite(parsedQty) ? Math.max(1, Math.trunc(parsedQty as number)) : 1;
        if (!uid) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: false, message: 'You need to sign in to add products to your cart.' }) }],
          };
        }
        if (!env.DB) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: false, message: 'The cart system is temporarily unavailable. Please try again later.' }) }],
          };
        }
        const product = await resolveProduct(productId, productName, env);

        if (!product || !product.id) {
          return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: 'Product not found. Please provide a clearer product name.' }) }] };
        }

        try {
          const { results } = await env.DB.prepare('SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?')
            .bind(uid, product.id).all();

          if (results.length > 0) {
            const item = results[0] as any;
            const currentQty = Number(item.quantity || 0);
            await env.DB.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').bind(currentQty + qty, item.id).run();
          } else {
            await env.DB.prepare('INSERT INTO cart_items (id, user_id, product_id, quantity, created_at) VALUES (?, ?, ?, ?, ?)')
              .bind(crypto.randomUUID(), uid, product.id, qty, new Date().toISOString()).run();
          }
        } catch (dbErr) {
          console.error('D1 cart insert error', dbErr);
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: false, message: 'Unable to add product to cart. Please try again.' }) }],
          };
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              product,
              quantity: qty,
              action: 'add_to_cart',
              message: `Added ${qty > 1 ? qty + ' ' : ''}${product.name} to your cart!`,
            })
          }]
        };
      } catch (e) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: 'Unable to add to cart. Please try again.' }) }] };
      }
    }
  );

  // 5. removeFromCart
  server.registerTool(
    'removeFromCart',
    {
      description: 'Remove a product from the cart.',
      inputSchema: z.object({
        productName: z.string().optional().describe('Product name to remove'),
        productId: z.string().optional().describe('Product ID to remove'),
        userId: z.string().optional().describe('User ID'),
      })
    },
    async ({ productName, productId, userId }) => {
      const uid = userId || ctxUserId;
      log('info', 'tool.removeFromCart', { productName, productId, userId: uid });
      try {
        const product = await resolveProduct(productId, productName, env);
        
        if (!product || !product.id || !uid || !env.DB) {
          return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: 'Product not found in cart.' }) }] };
        }
        
        await env.DB.prepare('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?').bind(uid, product.id).run();
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              action: 'remove_from_cart',
              productId: product.id,
              message: `Removed ${product.name} from your cart.`,
            })
          }]
        };
      } catch (e) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: 'Unable to remove product. Please try again.' }) }] };
      }
    }
  );

  // 6. startCheckout
  server.registerTool(
    'startCheckout',
    {
      description:
        'Start the voice checkout flow: read back the full cart, quantities, total amount, and ask for final confirmation.',
      inputSchema: z.object({ userId: z.string().optional().describe('User ID to read the cart') })
    },
    async ({ userId }) => {
      try {
        const uid = userId || ctxUserId;
        const { items, totalPrice } = await getCartForCheckout(env, uid || '');

        if (!uid) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  action: 'checkout_review',
                  message: 'You need to sign in before checkout.',
                }),
              },
            ],
          };
        }

        if (items.length === 0) {
          return { content: [{ type: 'text', text: JSON.stringify({ success: false, action: 'checkout_start', message: 'Your cart is empty.' }) }] };
        }

        const summary = formatCartSummary(items, totalPrice);
        const profile = await getUserDeliveryInfo(env, uid);
        const hasSavedDelivery = isCompleteDeliveryInfo(profile);

        const message = hasSavedDelivery
          ? `You are about to check out the following products: ${summary} Saved delivery address: ${profile.recipientName}, ${profile.phone}, ${profile.address}, ${profile.city}. If you agree, please say "confirm order".`
          : `You are about to check out the following products: ${summary} Please confirm by saying "confirm checkout" so I can send you to the checkout page to enter delivery information.`;

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              action: 'checkout_review',
              totalPrice,
              items,
              itemCount: items.length,
              hasSavedDelivery,
              savedDelivery: hasSavedDelivery
                ? {
                    name: profile.recipientName,
                    phone: profile.phone,
                    address: profile.address,
                    city: profile.city,
                  }
                : null,
              message,
            })
          }]
        };
      } catch (e) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, action: 'checkout_start', message: 'Unable to create the order.' }) }] };
      }
    }
  );

  server.registerTool(
    'confirmCheckout',
    {
      description:
        'Final checkout confirmation. If the user already has delivery information, confirm the address and place the order immediately. Otherwise, guide them to the checkout page to enter information.',
      inputSchema: z.object({
        userId: z.string().optional().describe('User ID for checkout processing'),
        confirmed: z
          .union([z.boolean(), z.string()])
          .optional()
          .describe('Whether the user confirms placing the order (true/false or "yes"/"no")'),
        name: z.string().optional().describe('Recipient name (if the user provides a new address)'),
        phone: z.string().optional().describe('Delivery phone number'),
        address: z.string().optional().describe('Delivery address'),
        city: z.string().optional().describe('City/Province'),
      }),
    },
    async ({ userId, confirmed, name, phone, address, city }) => {
      try {
        const uid = userId || ctxUserId;
        if (!uid) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: false, action: 'checkout_review', message: 'You need to sign in before placing an order.' }) }],
          };
        }

        const confirmationText = String(confirmed ?? '').toLowerCase().trim();
        const isConfirmed =
          confirmed === true ||
          confirmationText === 'true' ||
          confirmationText === 'yes' ||
          confirmationText === 'y' ||
          confirmationText === 'confirm';

        if (!isConfirmed) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  action: 'checkout_review',
                  message:
                    'I have not received your order confirmation yet. If you want to continue, please say "confirm order".',
                }),
              },
            ],
          };
        }

        const { items, totalPrice } = await getCartForCheckout(env, uid);
        if (!items.length) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  action: 'checkout_start',
                  message: 'Your cart is empty, so an order cannot be placed yet.',
                }),
              },
            ],
          };
        }

        const savedDelivery = await getUserDeliveryInfo(env, uid);
        const providedDelivery: DeliveryInfo = {
          recipientName: name || '',
          phone: phone || '',
          address: address || '',
          city: city || '',
        };

        const chosenDelivery = isCompleteDeliveryInfo(providedDelivery)
          ? providedDelivery
          : isCompleteDeliveryInfo(savedDelivery)
            ? savedDelivery
            : null;

        if (!chosenDelivery) {
          const summary = formatCartSummary(items, totalPrice);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  action: 'checkout_start',
                  requiresAddressForm: true,
                  totalPrice,
                  items,
                  message: `You have confirmed checkout: ${summary} I will take you to the checkout page to enter delivery information before placing the order.`,
                }),
              },
            ],
          };
        }

        await upsertUserDeliveryInfo(env, uid, chosenDelivery);
        const { orderId } = await createOrderFromCart(env, uid, items, totalPrice, chosenDelivery);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                action: 'checkout_complete',
                orderId,
                totalPrice,
                items,
                shippingAddress: {
                  name: chosenDelivery.recipientName,
                  phone: chosenDelivery.phone,
                  address: chosenDelivery.address,
                  city: chosenDelivery.city,
                },
                message: `Order #${orderId.slice(0, 8).toUpperCase()} has been confirmed and placed. Total amount ${totalPrice.toLocaleString('en-US')} VND. Delivering to ${chosenDelivery.address}, ${chosenDelivery.city}.`,
              }),
            },
          ],
        };
      } catch {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                action: 'checkout_review',
                message: 'Unable to confirm checkout right now. Please try again.',
              }),
            },
          ],
        };
      }
    },
  );

  server.registerTool(
    'getOrderStatus',
    {
      description: 'Check the status of an order.',
      inputSchema: z.object({
        orderId: z.string().optional().describe('Order ID or short order code'),
        userId: z.string().optional().describe('User ID to list all user orders'),
      })
    },
    async ({ orderId, userId }) => {
      const isValidId = userId && /^[a-zA-Z0-9_-]+$/.test(userId) && userId.length > 5;
      const uid = isValidId ? userId : ctxUserId;
      log('info', 'tool.getOrderStatus', { orderId, userId: uid });
      try {
        if (!env.DB) return { content: [{ type: 'text', text: JSON.stringify({ orders: [], message: 'Lookup error.' }) }] };

        if (orderId) {
          const { results } = await env.DB.prepare('SELECT id, status, total_price, items, created_at FROM orders WHERE id LIKE ?').bind(`%${orderId}%`).all();
          if (!results.length) return { content: [{ type: 'text', text: JSON.stringify({ orders: [], message: `No order found with code "${orderId}".` }) }] };

          const order = results[0] as any;
          const statusMap: Record<string, string> = { pending: 'Pending confirmation', confirmed: 'Confirmed', shipped: 'In transit', delivered: 'Delivered' };
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                orders: results,
                order: { ...order, statusText: statusMap[order.status] || order.status },
                action: 'order_status',
                message: `Order #${order.id.slice(0, 8).toUpperCase()}: ${statusMap[order.status] || order.status}`,
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
                  message: results.length ? `You have ${results.length} recent order(s).` : 'You do not have any orders yet.'
                })
             }]
          };
        }
        return { content: [{ type: 'text', text: JSON.stringify({ orders: [], action: 'order_status', message: 'Please provide an order code.' }) }] };
      } catch (e) {
        return { content: [{ type: 'text', text: JSON.stringify({ orders: [], message: 'System error.' }) }] };
      }
    }
  );

  server.registerTool(
    'cancelOrder',
    {
      description: 'Cancel a pending or confirmed order for the user.',
      inputSchema: z.object({
        orderId: z.string().describe('Order ID or short code to cancel'),
        userId: z.string().optional().describe('User ID for ownership verification'),
      })
    },
    async ({ orderId, userId }) => {
      log('info', 'tool.cancelOrder', { orderId, userId });
      try {
        if (!env.DB) {
          return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: 'Unable to cancel the order right now.' }) }] };
        }

        const { results } = await env.DB.prepare(
          'SELECT id, status, user_id FROM orders WHERE id LIKE ?'
        ).bind(`%${orderId}%`).all();

        if (!results.length) {
          return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: `No order found with code "${orderId}".` }) }] };
        }

        const order = results[0] as any;

        if (userId && order.user_id !== userId) {
          return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: 'You are not allowed to cancel this order.' }) }] };
        }

        const nonCancellableStatuses = ['shipped', 'delivered', 'cancelled'];
        if (nonCancellableStatuses.includes(order.status)) {
          const statusMap: Record<string, string> = { shipped: 'it is already in transit', delivered: 'it has already been delivered', cancelled: 'it was already cancelled previously' };
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: false, message: `Order #${order.id.slice(0, 8).toUpperCase()} cannot be cancelled because ${statusMap[order.status]}.` }) }]
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
               message: `Order #${order.id.slice(0, 8).toUpperCase()} has been cancelled successfully.`,
             })
           }]
         };
      } catch (e) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: 'Unable to cancel order. Please try again.' }) }] };
      }
    }
  );

  server.registerTool(
    'getFaqAnswer',
    {
      description: 'Answer frequently asked questions about store policies.',
      inputSchema: z.object({ question: z.string().describe('FAQ question') })
    },
    async ({ question }) => {
      try {
        if (!env.VECTORIZE_FAQ) return { content: [{ type: 'text', text: JSON.stringify({ answer: 'Please call 1800 2091.' }) }] };
        const embedding = await generateEmbedding(question, env);
        if (!embedding.length) return { content: [{ type: 'text', text: JSON.stringify({ answer: 'Error.' }) }] };

        const result = await env.VECTORIZE_FAQ.query(embedding, { topK: 1, returnMetadata: 'all' });
        const best = result?.matches?.[0];
        if (best?.score && best.score >= 0.45 && best.metadata?.answer) {
          return { content: [{ type: 'text', text: JSON.stringify({ answer: best.metadata.answer, action: 'faq' }) }] };
        }
        return { content: [{ type: 'text', text: JSON.stringify({ answer: 'No answer found, call 1800 2091.', action: 'faq' }) }] };
      } catch (e) {
        return { content: [{ type: 'text', text: JSON.stringify({ answer: 'FAQ error.' }) }] };
      }
    }
  );

  server.registerTool(
    'createSupportTicket',
    {
      description: 'Create a customer support ticket.',
      inputSchema: z.object({
        category: z.enum(['product_issue', 'delivery', 'payment', 'return_exchange', 'warranty', 'other']).describe('Support request category'),
        message: z.string().describe('Issue description'),
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
                message: `Support request #${ticketId.slice(0, 8).toUpperCase()} has been recorded.`,
              })
           }]
        };
      } catch (e) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: 'Ticket creation error.' }) }] };
      }
    }
  );

  // ── REVIEW TOOLS ──────────────────────────────────────────────────────────────

  server.registerTool(
    'submitReview',
    {
      description: 'Submit a review for a product.',
      inputSchema: z.object({
        productName: z.string().optional().describe('Product name'),
        productId: z.string().optional().describe('Product ID'),
        rating: z.number().int().min(1).max(5).describe('Rating from 1-5 stars'),
        comment: z.string().optional().describe('Review comment'),
        userId: z.string().optional().describe('User ID'),
      })
    },
    async ({ productName, productId, rating, comment, userId }) => {
      const uid = userId || ctxUserId;
      try {
        if (!uid || !env.DB) {
          return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: 'You need to sign in to submit a review.' }) }] };
        }

        const product = await resolveProduct(productId, productName, env, lastSearchResults);
        if (!product) {
          return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: 'Product not found.' }) }] };
        }

        // Check if already reviewed
        const { results: existing } = await env.DB.prepare(
          'SELECT id FROM reviews WHERE product_id = ? AND user_id = ?'
        ).bind(product.id, uid).all();

        if (existing.length > 0) {
          return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: 'You have already reviewed this product.' }) }] };
        }

        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        
        await env.DB.prepare(
          `INSERT INTO reviews (id, product_id, user_id, rating, comment, images, verified_purchase, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(id, product.id, uid, rating, comment || '', '[]', 0, now, now).run();

        // Update product rating
        const { results: stats } = await env.DB.prepare(
          'SELECT AVG(rating) as avg_rating, COUNT(*) as review_count FROM reviews WHERE product_id = ?'
        ).bind(product.id).all();
        
        if (stats.length > 0) {
          const { avg_rating, review_count } = stats[0] as any;
          await env.DB.prepare(
            'UPDATE products SET rating = ?, review_count = ? WHERE id = ?'
          ).bind(avg_rating, review_count, product.id).run();
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              reviewId: id,
              product: product.name,
              rating,
              action: 'submit_review',
              message: `Submitted a ${rating}-star review for ${product.name}. Thank you!`,
            })
          }]
        };
      } catch (e) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: 'Unable to submit review.' }) }] };
      }
    }
  );

  // ── ADDRESS TOOLS ─────────────────────────────────────────────────────────────

  server.registerTool(
    'saveAddress',
    {
      description: 'Save a new delivery address.',
      inputSchema: z.object({
        name: z.string().describe('Recipient name'),
        phone: z.string().describe('Phone number'),
        street: z.string().describe('Street address'),
        city: z.string().describe('City'),
        ward: z.string().optional().describe('Ward'),
        district: z.string().optional().describe('District'),
        label: z.string().optional().describe('Label: Home, Work, Other'),
        setAsDefault: z.boolean().optional().describe('Set as default address'),
        userId: z.string().optional().describe('User ID'),
      })
    },
    async ({ name, phone, street, city, ward, district, label, setAsDefault, userId }) => {
      const uid = userId || ctxUserId;
      try {
        if (!uid || !env.DB) {
          return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: 'You need to sign in to save an address.' }) }] };
        }

        // Validate phone number (10 digits starting with 0)
        const phoneRegex = /^0\d{9}$/;
        if (!phoneRegex.test(phone)) {
          return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: 'Invalid phone number (must be 10 digits and start with 0).' }) }] };
        }

        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const isDefault = setAsDefault ? 1 : 0;
        
        // If setting as default, unset other defaults
        if (isDefault) {
          await env.DB.prepare(
            'UPDATE addresses SET is_default = 0 WHERE user_id = ?'
          ).bind(uid).run();
        }
        
        await env.DB.prepare(
          `INSERT INTO addresses (id, user_id, label, name, phone, street, ward, district, city, is_default, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(id, uid, label || 'Other', name, phone, street, ward || '', district || '', city, isDefault, now, now).run();

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              addressId: id,
              action: 'save_address',
              message: `Saved ${label || 'new'} address: ${street}, ${city}`,
            })
          }]
        };
      } catch (e) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, message: 'Unable to save address.' }) }] };
      }
    }
  );

  server.registerTool(
    'getAddresses',
    {
      description: 'Get the list of saved user addresses.',
      inputSchema: z.object({
        userId: z.string().describe('User ID'),
      })
    },
    async ({ userId }) => {
      const uid = userId || ctxUserId;
      try {
        if (!uid || !env.DB) {
          return { content: [{ type: 'text', text: JSON.stringify({ success: false, addresses: [], message: 'You need to sign in.' }) }] };
        }

        const { results } = await env.DB.prepare(
          `SELECT id, label, name, phone, street, ward, district, city, is_default
           FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC`
        ).bind(uid).all();

        const addresses = (results || []).map((row: any) => ({
          id: row.id,
          label: row.label,
          name: row.name,
          phone: row.phone,
          street: row.street,
          ward: row.ward,
          district: row.district,
          city: row.city,
          isDefault: row.is_default === 1,
        }));

        if (addresses.length === 0) {
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, addresses: [], action: 'get_addresses', message: 'You do not have any saved addresses yet.' }) }] };
        }

        const summary = addresses.map((addr, i) => `${i + 1}. ${addr.label}: ${addr.street}, ${addr.city}${addr.isDefault ? ' (Default)' : ''}`).join('; ');
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              addresses,
              count: addresses.length,
              action: 'get_addresses',
              message: `You have ${addresses.length} saved address(es): ${summary}`,
            })
          }]
        };
      } catch (e) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, addresses: [], message: 'Unable to retrieve address list.' }) }] };
      }
    }
  );

  // ── PROMO CODE TOOLS ──────────────────────────────────────────────────────────

  server.registerTool(
    'validatePromoCode',
    {
      description: 'Validate and apply a promo code.',
      inputSchema: z.object({
        code: z.string().describe('Promo code'),
        orderTotal: z.number().describe('Total order value'),
        userId: z.string().optional().describe('User ID'),
      })
    },
    async ({ code, orderTotal, userId }) => {
      const uid = userId || ctxUserId;
      try {
        if (!env.DB) {
          return { content: [{ type: 'text', text: JSON.stringify({ valid: false, message: 'Unable to validate promo code right now.' }) }] };
        }

        // Get promo code
        const { results } = await env.DB.prepare(
          'SELECT * FROM promo_codes WHERE code = ? AND is_active = 1'
        ).bind(code.toUpperCase()).all();
        
        if (results.length === 0) {
          return { content: [{ type: 'text', text: JSON.stringify({ valid: false, action: 'validate_promo', message: 'Invalid promo code.' }) }] };
        }
        
        const promo = results[0] as any;
        
        // Check expiration
        if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
          return { content: [{ type: 'text', text: JSON.stringify({ valid: false, action: 'validate_promo', message: 'Promo code has expired.' }) }] };
        }
        
        // Check usage limit
        if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
          return { content: [{ type: 'text', text: JSON.stringify({ valid: false, action: 'validate_promo', message: 'Promo code usage limit has been reached.' }) }] };
        }
        
        // Check minimum order value
        if (promo.min_order_value && orderTotal < promo.min_order_value) {
          return { content: [{ type: 'text', text: JSON.stringify({ valid: false, action: 'validate_promo', message: `Minimum order value is ${promo.min_order_value.toLocaleString('en-US')} VND.` }) }] };
        }
        
        // Check if user already used this code
        if (uid) {
          const { results: usageCheck } = await env.DB.prepare(
            'SELECT id FROM promo_code_usage WHERE promo_code_id = ? AND user_id = ?'
          ).bind(promo.id, uid).all();
          
          if (usageCheck.length > 0) {
            return { content: [{ type: 'text', text: JSON.stringify({ valid: false, action: 'validate_promo', message: 'You have already used this promo code.' }) }] };
          }
        }
        
        // Calculate discount
        let discount = 0;
        if (promo.discount_type === 'percentage') {
          discount = orderTotal * (promo.discount_value / 100);
          if (promo.max_discount && discount > promo.max_discount) {
            discount = promo.max_discount;
          }
        } else {
          discount = promo.discount_value;
        }
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              valid: true,
              promoCode: {
                id: promo.id,
                code: promo.code,
                discountType: promo.discount_type,
                discountValue: promo.discount_value,
                discountAmount: discount,
              },
              action: 'validate_promo',
              message: `Code ${code} is valid! Discount ${discount.toLocaleString('en-US')} VND. Total after discount: ${(orderTotal - discount).toLocaleString('en-US')} VND.`,
            })
          }]
        };
      } catch (e) {
        return { content: [{ type: 'text', text: JSON.stringify({ valid: false, message: 'Promo code validation error.' }) }] };
      }
    }
  );

  return server;
}
