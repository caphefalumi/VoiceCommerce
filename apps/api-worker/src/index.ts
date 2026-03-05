import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createAuth, type Env as AuthEnv } from './lib/auth';
import { requireAuth } from './middleware/auth';
import type { AuthUser } from './middleware/auth';

type Bindings = {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  MAILERSEND_API_KEY: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
};

type Variables = {
  user: AuthUser;
};

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  brand: string;
  description: string;
  images: string;
  specs: string;
  reviews: string;
  url: string;
  embedding: string;
}

// Cache auth instance per env object (reused within same CF Worker isolate)
const authCache = new WeakMap<AuthEnv, ReturnType<typeof createAuth>>();
function getAuth(env: AuthEnv) {
  let auth = authCache.get(env);
  if (!auth) {
    auth = createAuth(env);
    authCache.set(env, auth);
  }
  return auth;
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use('*', cors({
  origin: ['https://tgdd-frontend.pages.dev', 'http://localhost:5173'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

app.all('/api/auth/*', (c) => {
  const auth = getAuth(c.env);
  return auth.handler(c.req.raw);
});

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// ── PRODUCTS ───────────────────────────────────────────────────────────────────

// GET /api/products - List all products with filtering
app.get('/api/products', async (c) => {
  try {
    const { category, search, minPrice, maxPrice } = c.req.query();
    
    let query = 'SELECT id, name, price, original_price, category, brand, rating, review_count, stock, description, images, specs, reviews, url, created_at FROM products WHERE 1=1';
    const params: any[] = [];
    
    if (category && category.trim() !== '') {
      query += ' AND category = ?';
      params.push(category);
    }
    
    if (search && search.trim() !== '') {
      query += ' AND (name LIKE ? OR description LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }
    
    if (minPrice && minPrice.trim() !== '') {
      query += ' AND price >= ?';
      params.push(parseFloat(minPrice));
    }
    
    if (maxPrice && maxPrice.trim() !== '') {
      query += ' AND price <= ?';
      params.push(parseFloat(maxPrice));
    }
    
    query += ' LIMIT 200';
    
    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    
    const products = (results || []).map((row: any) => {
      const price = row.price || 0;
      const originalPrice = row.original_price || price;
      const discountPercentage = originalPrice > price 
        ? Math.round(((originalPrice - price) / originalPrice) * 100) 
        : 0;
      
      return {
        id: row.id,
        name: row.name,
        brand: row.brand || 'Unknown',
        price: price,
        originalPrice: originalPrice,
        discountPercentage: discountPercentage,
        isFlashSale: discountPercentage >= 10,
        isNew: false,
        category: row.category,
        rating: row.rating || 0,
        reviewCount: row.review_count || 0,
        stock: row.stock || 0,
        description: row.description,
        images: row.images ? JSON.parse(row.images) : [],
        specs: row.specs ? JSON.parse(row.specs) : [],
        reviews: row.reviews ? JSON.parse(row.reviews) : [],
        url: row.url,
        createdAt: row.created_at,
      };
    });
    
    return c.json({ products });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/products/:id - Get single product
app.get('/api/products/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT id, name, price, original_price, category, brand, rating, review_count, stock, description, images, specs, reviews, url, created_at FROM products WHERE id = ?'
    ).bind(id).all();
    
    if (results.length === 0) {
      return c.json({ error: 'Product not found' }, 404);
    }
    
    const row = results[0] as any;
    const price = row.price || 0;
    const originalPrice = row.original_price || price;
    const discountPercentage = originalPrice > price 
      ? Math.round(((originalPrice - price) / originalPrice) * 100) 
      : 0;
    
    const product = {
      id: row.id,
      name: row.name,
      brand: row.brand || 'Unknown',
      price: price,
      originalPrice: originalPrice,
      discountPercentage: discountPercentage,
      isFlashSale: discountPercentage >= 10,
      isNew: false,
      category: row.category,
      rating: row.rating || 0,
      reviewCount: row.review_count || 0,
      stock: row.stock || 0,
      description: row.description,
      images: row.images ? JSON.parse(row.images) : [],
      specs: row.specs ? JSON.parse(row.specs) : [],
      reviews: row.reviews ? JSON.parse(row.reviews) : [],
      url: row.url,
      createdAt: row.created_at,
    };
    
    return c.json({ product });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/products - Create new product
app.post('/api/products', async (c) => {
  try {
    const body = await c.req.json<Partial<Product>>();
    
    if (!body.name || !body.price) {
      return c.json({ error: 'name and price are required' }, 400);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    await c.env.DB.prepare(
      `INSERT INTO products (id, name, price, category, brand, description, images, specs, reviews, url, embedding, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      body.name,
      body.price || 0,
      body.category || '',
      body.brand || '',
      body.description || '',
      body.images || '[]',
      body.specs || '[]',
      body.reviews || '[]',
      body.url || '',
      '',
      now,
      now
    ).run();

    return c.json({ id, message: 'Product created successfully' }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ── USERS ───────────────────────────────────────────────────────────────────

// GET /api/users/:id - Get user by ID
app.get('/api/users/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT id, email, username, created_at FROM users WHERE id = ?'
    ).bind(id).all();
    
    if (results.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }
    return c.json({ user: results[0] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ── CART ───────────────────────────────────────────────────────────────────

// GET /api/cart - Get authenticated user's cart
app.get('/api/cart', requireAuth, async (c) => {
  const user = c.get('user');
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT ci.id, ci.user_id, ci.product_id, ci.quantity, ci.created_at,
              p.name, p.price, p.images, p.brand
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = ?`
    ).bind(user.id).all();
    return c.json({ cart: results });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/cart - Add item to cart
app.post('/api/cart', requireAuth, async (c) => {
  const user = c.get('user');
  try {
    const { product_id, quantity = 1 } = await c.req.json();
    if (!product_id) return c.json({ error: 'product_id is required' }, 400);

    const { results: existing } = await c.env.DB.prepare(
      'SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?'
    ).bind(user.id, product_id).all();

    if (existing.length > 0) {
      const existingItem = existing[0] as { id: string; quantity: number };
      await c.env.DB.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?')
        .bind(existingItem.quantity + quantity, existingItem.id).run();
      return c.json({ message: 'Cart item quantity updated' });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await c.env.DB.prepare(
      'INSERT INTO cart_items (id, user_id, product_id, quantity, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, user.id, product_id, quantity, now).run();

    return c.json({ id, message: 'Item added to cart' }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /api/cart/:productId - Remove item from cart
app.delete('/api/cart/:productId', requireAuth, async (c) => {
  const user = c.get('user');
  const productId = c.req.param('productId');
  try {
    const { results } = await c.env.DB.prepare(
      'DELETE FROM cart_items WHERE user_id = ? AND product_id = ? RETURNING id'
    ).bind(user.id, productId).all();
    if (results.length === 0) return c.json({ error: 'Item not found in cart' }, 404);
    return c.json({ message: 'Item removed from cart' });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ── ORDERS ──────────────────────────────────────────────────────────────────

// POST /api/orders - Create a new order (checkout flow, FR9/FR10)
app.post('/api/orders', async (c) => {
  try {
    const { user_id, items, total_price, shipping_address } = await c.req.json();

    if (!user_id || !items || !total_price) {
      return c.json({ error: 'user_id, items, and total_price are required' }, 400);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const itemsJson = typeof items === 'string' ? items : JSON.stringify(items);

    await c.env.DB.prepare(
      `INSERT INTO orders (id, user_id, status, total_price, items, shipping_address, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, user_id, 'confirmed', total_price,
      itemsJson,
      shipping_address ? JSON.stringify(shipping_address) : null,
      now, now
    ).run();

    await c.env.DB.prepare('DELETE FROM cart_items WHERE user_id = ?').bind(user_id).run();

    const summary = (Array.isArray(items) ? items : JSON.parse(itemsJson))
      .map((item: any, i: number) =>
        `${i + 1}. ${item.name} x${item.quantity} — ${(item.price * item.quantity).toLocaleString('vi-VN')} VND`
      ).join('\n');

    return c.json({
      id,
      status: 'confirmed',
      total_price,
      confirmation_text: `Đơn hàng #${id.slice(0, 8).toUpperCase()} đã được xác nhận!\n${summary}\nTổng cộng: ${Number(total_price).toLocaleString('vi-VN')} VND. Cảm ơn bạn đã mua hàng tại TGDD!`,
      message: 'Order created successfully'
    }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/orders/:userId - List orders for a user (FR13)
app.get('/api/orders/:userId', async (c) => {
  const userId = c.req.param('userId');
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT id, user_id, status, total_price, items, shipping_address, created_at, updated_at
       FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`
    ).bind(userId).all();

    const statusMap: Record<string, string> = {
      pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', processing: 'Đang xử lý',
      shipped: 'Đang vận chuyển', delivered: 'Đã giao hàng', cancelled: 'Đã hủy',
    };

    const orders = (results || []).map((row: any) => ({
      ...row,
      items: row.items ? JSON.parse(row.items) : [],
      shipping_address: row.shipping_address ? JSON.parse(row.shipping_address) : null,
      status_text: statusMap[row.status] || row.status,
      short_id: row.id.slice(0, 8).toUpperCase(),
    }));

    return c.json({ orders });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/orders/status/:orderId - Get single order status (FR13 voice order status)
app.get('/api/orders/status/:orderId', async (c) => {
  const orderId = c.req.param('orderId');
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT id, user_id, status, total_price, items, shipping_address, created_at, updated_at
       FROM orders WHERE id LIKE ?`
    ).bind(`%${orderId}%`).all();

    if (!results.length) {
      return c.json({ error: 'Order not found' }, 404);
    }

    const row = results[0] as any;
    const statusMap: Record<string, string> = {
      pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', processing: 'Đang xử lý',
      shipped: 'Đang vận chuyển', delivered: 'Đã giao hàng', cancelled: 'Đã hủy',
    };

    return c.json({
      order: {
        ...row,
        items: row.items ? JSON.parse(row.items) : [],
        shipping_address: row.shipping_address ? JSON.parse(row.shipping_address) : null,
        status_text: statusMap[row.status] || row.status,
        short_id: row.id.slice(0, 8).toUpperCase(),
      }
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// PATCH /api/orders/:orderId/status - Update order status
app.patch('/api/orders/:orderId/status', async (c) => {
  const orderId = c.req.param('orderId');
  try {
    const { status } = await c.req.json();
    const validStatuses = ['pending','confirmed','processing','shipped','delivered','cancelled'];
    if (!validStatuses.includes(status)) {
      return c.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, 400);
    }
    const now = new Date().toISOString();
    await c.env.DB.prepare(
      'UPDATE orders SET status = ?, updated_at = ? WHERE id = ?'
    ).bind(status, now, orderId).run();
    return c.json({ message: 'Order status updated' });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ── SUPPORT TICKETS ──────────────────────────────────────────────────────────

// POST /api/tickets - Create a support ticket (FR12)
app.post('/api/tickets', async (c) => {
  try {
    const { user_id, category, message } = await c.req.json();

    if (!category || !message) {
      return c.json({ error: 'category and message are required' }, 400);
    }

    const validCategories = ['product_issue','delivery','payment','return_exchange','warranty','other'];
    if (!validCategories.includes(category)) {
      return c.json({ error: `Invalid category. Must be one of: ${validCategories.join(', ')}` }, 400);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await c.env.DB.prepare(
      'INSERT INTO support_tickets (id, user_id, category, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, user_id || null, category, message, 'open', now).run();

    const categoryLabels: Record<string, string> = {
      product_issue: 'Lỗi sản phẩm', delivery: 'Vận chuyển', payment: 'Thanh toán',
      return_exchange: 'Đổi trả hàng', warranty: 'Bảo hành', other: 'Khác',
    };

    return c.json({
      id,
      short_id: id.slice(0, 8).toUpperCase(),
      status: 'open',
      category_label: categoryLabels[category],
      confirmation_text: `Yêu cầu hỗ trợ #${id.slice(0, 8).toUpperCase()} — ${categoryLabels[category]} đã được ghi nhận. Nhân viên sẽ liên hệ trong 24 giờ. Hotline: 1800 2091.`,
      message: 'Support ticket created'
    }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/tickets/:userId - List support tickets for a user
app.get('/api/tickets/:userId', async (c) => {
  const userId = c.req.param('userId');
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT id, user_id, category, message, status, created_at
       FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`
    ).bind(userId).all();

    const categoryLabels: Record<string, string> = {
      product_issue: 'Lỗi sản phẩm', delivery: 'Vận chuyển', payment: 'Thanh toán',
      return_exchange: 'Đổi trả hàng', warranty: 'Bảo hành', other: 'Khác',
    };

    const tickets = (results || []).map((row: any) => ({
      ...row,
      category_label: categoryLabels[row.category] || row.category,
      short_id: row.id.slice(0, 8).toUpperCase(),
    }));

    return c.json({ tickets });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ── ADMIN: FAQ Knowledge Base (FR14) ──────────────────────────────────────────

// GET /api/admin/faqs - List all FAQs
app.get('/api/admin/faqs', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT id, question, answer, category, created_at, updated_at FROM faqs ORDER BY created_at DESC'
    ).all();
    return c.json({ faqs: results || [] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/admin/faqs - Create FAQ entry
app.post('/api/admin/faqs', async (c) => {
  try {
    const { question, answer, category } = await c.req.json();
    if (!question || !answer) {
      return c.json({ error: 'question and answer are required' }, 400);
    }
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await c.env.DB.prepare(
      'INSERT INTO faqs (id, question, answer, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, question, answer, category || 'general', now, now).run();
    return c.json({ id, message: 'FAQ created' }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// PUT /api/admin/faqs/:id - Update FAQ entry
app.put('/api/admin/faqs/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const { question, answer, category } = await c.req.json();
    const now = new Date().toISOString();
    await c.env.DB.prepare(
      'UPDATE faqs SET question = ?, answer = ?, category = ?, updated_at = ? WHERE id = ?'
    ).bind(question, answer, category || 'general', now, id).run();
    return c.json({ message: 'FAQ updated' });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /api/admin/faqs/:id - Delete FAQ entry
app.delete('/api/admin/faqs/:id', async (c) => {
  const id = c.req.param('id');
  try {
    await c.env.DB.prepare('DELETE FROM faqs WHERE id = ?').bind(id).run();
    return c.json({ message: 'FAQ deleted' });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ── ADMIN: Voice Interaction Logs (FR15) ────────────────────────────────────────

// GET /api/admin/voice-logs - List all voice logs
app.get('/api/admin/voice-logs', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50');
    const { results } = await c.env.DB.prepare(
      'SELECT id, session_id, user_id, user_text, response_text, intent, created_at FROM voice_logs ORDER BY created_at DESC LIMIT ?'
    ).bind(limit).all();
    return c.json({ logs: results || [] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/admin/voice-logs - Record a voice interaction (called by ai-worker)
app.post('/api/admin/voice-logs', async (c) => {
  try {
    const { session_id, user_id, user_text, response_text, intent } = await c.req.json();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await c.env.DB.prepare(
      'INSERT INTO voice_logs (id, session_id, user_id, user_text, response_text, intent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, session_id || null, user_id || null, user_text || '', response_text || '', intent || null, now).run();
    return c.json({ id }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ── ADMIN: Support Tickets Admin View (FR15) ─────────────────────────────────────

// GET /api/admin/tickets - List ALL tickets (admin)
app.get('/api/admin/tickets', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT id, user_id, category, message, status, created_at FROM support_tickets ORDER BY created_at DESC LIMIT 100'
    ).all();

    const categoryLabels: Record<string, string> = {
      product_issue: 'Lỗi sản phẩm', delivery: 'Vận chuyển', payment: 'Thanh toán',
      return_exchange: 'Đổi trả hàng', warranty: 'Bảo hành', other: 'Khác',
    };

    const tickets = (results || []).map((row: any) => ({
      ...row,
      category_label: categoryLabels[row.category] || row.category,
      short_id: row.id.slice(0, 8).toUpperCase(),
    }));

    return c.json({ tickets });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// PATCH /api/admin/tickets/:id/status - Update ticket status
app.patch('/api/admin/tickets/:id/status', async (c) => {
  const id = c.req.param('id');
  try {
    const { status } = await c.req.json();
    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return c.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, 400);
    }
    await c.env.DB.prepare(
      'UPDATE support_tickets SET status = ? WHERE id = ?'
    ).bind(status, id).run();
    return c.json({ message: 'Ticket status updated' });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default app;
