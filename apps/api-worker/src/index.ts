import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createAuth, type Env as AuthEnv } from './lib/auth';
import { requireAuth, requireAdmin } from './middleware/auth';
import type { AuthUser } from './middleware/auth';

// Helper to parse specs from DB format to frontend format
function parseSpecs(specsJson: string): Record<string, string> {
  try {
    const specs = JSON.parse(specsJson);
    if (Array.isArray(specs)) {
      const result: Record<string, string> = {};
      for (const item of specs) {
        if (item.label && item.value) {
          result[item.label] = item.value;
        }
      }
      return result;
    }
    return specs;
  } catch {
    return {};
  }
}

// Helper to decode Unicode escape sequences in strings
function decodeUnicodeStr(str: string): string {
  if (!str) return str;
  try {
    if (str.includes('\\u')) {
      return str.replace(/\\u([0-9a-fA-F]{4})/g, (_: string, code: string) => 
        String.fromCharCode(parseInt(code, 16))
      );
    }
    return str;
  } catch {
    return str;
  }
}

// Helper to parse reviews from DB format to frontend format
function parseReviews(reviewsJson: string): Array<{
  id: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}> {
  try {
    const reviews = JSON.parse(reviewsJson);
    if (Array.isArray(reviews)) {
      return reviews.map((r: any, index: number) => ({
        id: `review-${index}`,
        userName: r.userName || `User ${index + 1}`,
        rating: r.rating || r.star || 0,
        comment: decodeUnicodeStr(r.content || r.comment || r.review || ''),
        date: r.date || r.createdAt || new Date().toISOString(),
      }));
    }
    return [];
  } catch {
    return [];
  }
}

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

type VoiceMessage = {
  id: string;
  session_id: string;
  user_id: string | null;
  role: 'user' | 'assistant';
  text: string;
  intent: string | null;
  created_at: string;
};

type VoiceSessionSummary = {
  id: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  last_intent: string | null;
  last_user_text: string | null;
  last_response_text: string | null;
  message_count: number;
};

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
        specs: row.specs ? parseSpecs(row.specs) : {},
        reviews: row.reviews ? parseReviews(row.reviews) : [],
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
      return c.json({ error: 'Không tìm thấy sản phẩm' }, 404);
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
      specs: row.specs ? parseSpecs(row.specs) : {},
      reviews: row.reviews ? parseReviews(row.reviews) : [],
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
      return c.json({ error: 'Tên và giá sản phẩm là bắt buộc' }, 400);
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

    return c.json({ id, message: 'Tạo sản phẩm thành công' }, 201);
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
      return c.json({ error: 'Không tìm thấy người dùng' }, 404);
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
       LEFT JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = ?`
    ).bind(user.id).all();
    
    const cart = (results || []).map((row: any) => ({
      ...row,
      images: row.images ? (Array.isArray(row.images) ? row.images : JSON.parse(row.images)) : [],
      product_exists: row.name !== null,
    })).filter((item: any) => item.product_exists);
    
    return c.json({ cart });
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

    // Validate product exists in products table
    const { results: productCheck } = await c.env.DB.prepare(
      'SELECT id FROM products WHERE id = ?'
    ).bind(product_id).all();
    
    if (productCheck.length === 0) {
      return c.json({ error: 'Sản phẩm không tồn tại. Có thể sản phẩm đã bị xóa khỏi danh mục.', product_id }, 404);
    }

    const { results: existing } = await c.env.DB.prepare(
      'SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?'
    ).bind(user.id, product_id).all();

    if (existing.length > 0) {
      const existingItem = existing[0] as { id: string; quantity: number };
      await c.env.DB.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?')
        .bind(existingItem.quantity + quantity, existingItem.id).run();
      return c.json({ message: 'Đã cập nhật số lượng sản phẩm trong giỏ hàng' });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await c.env.DB.prepare(
      'INSERT INTO cart_items (id, user_id, product_id, quantity, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, user.id, product_id, quantity, now).run();

    return c.json({ id, message: 'Đã thêm sản phẩm vào giỏ hàng' }, 201);
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
    if (results.length === 0) return c.json({ error: 'Không tìm thấy sản phẩm trong giỏ hàng' }, 404);
    return c.json({ message: 'Đã xóa sản phẩm khỏi giỏ hàng' });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ── ORDERS ──────────────────────────────────────────────────────────────────

// POST /api/orders - Create a new order (checkout flow, FR9/FR10)
app.post('/api/orders', async (c) => {
  try {
    const { user_id, user_email, user_name, items, total_price, shipping_address } = await c.req.json();

    if (!user_id || !items || !total_price) {
      return c.json({ error: 'user_id, items, và total_price là các trường bắt buộc' }, 400);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const itemsJson = typeof items === 'string' ? items : JSON.stringify(items);

    await c.env.DB.prepare(
      `INSERT INTO orders (id, user_id, status, total_price, items, shipping_address, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, user_id, 'preparing', total_price,
      itemsJson,
      shipping_address ? JSON.stringify(shipping_address) : null,
      now, now
    ).run();

    await c.env.DB.prepare('DELETE FROM cart_items WHERE user_id = ?').bind(user_id).run();

    if (shipping_address?.address && shipping_address?.city) {
      await c.env.DB
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
          shipping_address?.name || user_name || null,
          shipping_address?.phone || null,
          shipping_address?.address,
          shipping_address?.city,
          Date.now(),
          user_id,
        )
        .run();
    }

    const itemsList = (Array.isArray(items) ? items : JSON.parse(itemsJson));
    const summary = itemsList
      .map((item: any, i: number) =>
        `${i + 1}. ${item.name} x${item.quantity} — ${(item.price * item.quantity).toLocaleString('vi-VN')} VND`
      ).join('\n');

    const orderSummary = `Đơn hàng #${id.slice(0, 8).toUpperCase()} đã được xác nhận!\n${summary}\nTổng cộng: ${Number(total_price).toLocaleString('vi-VN')} VND. Cảm ơn bạn đã mua hàng tại TGDD!`;

    // Send confirmation email via MailerSend
    const mailerSendKey = c.env.MAILERSEND_API_KEY;
    if (mailerSendKey && user_email) {
      try {
        const emailRes = await fetch('https://api.mailersend.com/v1/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mailerSendKey}`,
          },
          body: JSON.stringify({
            from: { email: 'noreply@tgdd.shop', name: 'TGDD - Thế Giới Di Động' },
            to: [{ email: user_email, name: user_name || 'Khách hàng' }],
            subject: `Xác nhận đơn hàng #${id.slice(0, 8).toUpperCase()} - TGDD`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #facc15;">Xác nhận đơn hàng</h2>
                <p>Xin chào <strong>${user_name || 'Quý khách'}</strong>,</p>
                <p>Cảm ơn bạn đã đặt hàng tại <strong>Thế Giới Di Động</strong>!</p>
                <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
                  <p><strong>Mã đơn hàng:</strong> #${id.slice(0, 8).toUpperCase()}</p>
                  <p><strong>Ngày đặt:</strong> ${new Date(now).toLocaleString('vi-VN')}</p>
                  <p><strong>Tổng tiền:</strong> ${Number(total_price).toLocaleString('vi-VN')} VND</p>
                </div>
                <h3>Sản phẩm đã đặt:</h3>
                <ul>
                  ${itemsList.map((item: any) => `<li>${item.name} x${item.quantity} - ${(item.price * item.quantity).toLocaleString('vi-VN')} VND</li>`).join('')}
                </ul>
                <p>Đơn hàng sẽ được giao đến địa chỉ: ${shipping_address?.address || 'N/A'}, ${shipping_address?.city || ''}</p>
                <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">Trân trọng,<br>Thế Giới Di Động</p>
              </div>
            `,
            text: `Xin chào ${user_name || 'Quý khách'},\n\nCảm ơn bạn đã đặt hàng tại Thế Giới Di Động!\n\nMã đơn hàng: #${id.slice(0, 8).toUpperCase()}\nTổng tiền: ${Number(total_price).toLocaleString('vi-VN')} VND\n\nSản phẩm:\n${summary}\n\nTrân trọng,\nThế Giới Di Động`,
          }),
        });
        console.log('MailerSend response:', emailRes.status);
      } catch (emailErr) {
        console.error('Failed to send email:', emailErr);
      }
    }

    return c.json({
      id,
      status: 'preparing',
      total_price,
      confirmation_text: orderSummary,
      message: 'Đặt hàng thành công'
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
      pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', preparing: 'Thế giới di động đang chuẩn bị hàng',
      processing: 'Đang xử lý', shipped: 'Đang vận chuyển', delivered: 'Giao hàng thành công', cancelled: 'Đã hủy',
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
      return c.json({ error: 'Không tìm thấy đơn hàng' }, 404);
    }

    const row = results[0] as any;
    const statusMap: Record<string, string> = {
      pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', preparing: 'Thế giới di động đang chuẩn bị hàng',
      processing: 'Đang xử lý', shipped: 'Đang vận chuyển', delivered: 'Giao hàng thành công', cancelled: 'Đã hủy',
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
    const validStatuses = ['pending','confirmed','preparing','processing','shipped','delivered','cancelled'];
    if (!validStatuses.includes(status)) {
      return c.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, 400);
    }
    const now = new Date().toISOString();
    await c.env.DB.prepare(
      'UPDATE orders SET status = ?, updated_at = ? WHERE id = ?'
    ).bind(status, now, orderId).run();
    return c.json({ message: 'Đã cập nhật trạng thái đơn hàng' });
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
      return c.json({ error: 'Danh mục và nội dung tin nhắn là bắt buộc' }, 400);
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
      message: 'Đã gửi phiếu hỗ trợ thành công'
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
app.get('/api/admin/faqs', requireAdmin, async (c) => {
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
app.post('/api/admin/faqs', requireAdmin, async (c) => {
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
    return c.json({ id, message: 'Đã tạo FAQ thành công' }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// PUT /api/admin/faqs/:id - Update FAQ entry
app.put('/api/admin/faqs/:id', requireAdmin, async (c) => {
  const id = c.req.param('id');
  try {
    const { question, answer, category } = await c.req.json();
    const now = new Date().toISOString();
    await c.env.DB.prepare(
      'UPDATE faqs SET question = ?, answer = ?, category = ?, updated_at = ? WHERE id = ?'
    ).bind(question, answer, category || 'general', now, id).run();
    return c.json({ message: 'Đã cập nhật FAQ thành công' });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /api/admin/faqs/:id - Delete FAQ entry
app.delete('/api/admin/faqs/:id', requireAdmin, async (c) => {
  const id = c.req.param('id');
  try {
    await c.env.DB.prepare('DELETE FROM faqs WHERE id = ?').bind(id).run();
    return c.json({ message: 'Đã xóa FAQ thành công' });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ── ADMIN: Voice Interaction Logs (FR15) ────────────────────────────────────────

// GET /api/admin/voice-logs - List all voice logs
app.get('/api/admin/voice-logs', requireAdmin, async (c) => {
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
    const normalizedSessionId = session_id || crypto.randomUUID();
    const normalizedUserId = user_id || null;
    const normalizedIntent = intent || null;
    const normalizedUserText = (user_text || '').toString();
    const normalizedResponseText = (response_text || '').toString();

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await c.env.DB
      .prepare(
        `INSERT INTO voice_sessions (id, user_id, created_at, updated_at, last_intent, last_user_text, last_response_text)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           user_id = COALESCE(excluded.user_id, voice_sessions.user_id),
           updated_at = excluded.updated_at,
           last_intent = excluded.last_intent,
           last_user_text = excluded.last_user_text,
           last_response_text = excluded.last_response_text`,
      )
      .bind(
        normalizedSessionId,
        normalizedUserId,
        now,
        now,
        normalizedIntent,
        normalizedUserText,
        normalizedResponseText,
      )
      .run();

    await c.env.DB.prepare(
      'INSERT INTO voice_logs (id, session_id, user_id, user_text, response_text, intent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, normalizedSessionId, normalizedUserId, normalizedUserText, normalizedResponseText, normalizedIntent, now).run();

    const userMessageId = crypto.randomUUID();
    await c.env.DB
      .prepare(
        `INSERT INTO voice_messages (id, session_id, user_id, role, text, intent, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(userMessageId, normalizedSessionId, normalizedUserId, 'user', normalizedUserText, normalizedIntent, now)
      .run();

    const assistantMessageId = crypto.randomUUID();
    await c.env.DB
      .prepare(
        `INSERT INTO voice_messages (id, session_id, user_id, role, text, intent, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        assistantMessageId,
        normalizedSessionId,
        normalizedUserId,
        'assistant',
        normalizedResponseText,
        normalizedIntent,
        now,
      )
      .run();

    return c.json({ id }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/api/admin/voice-sessions', requireAdmin, async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '100');
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 100;
    const { results } = await c.env.DB
      .prepare(
        `SELECT
           vs.id,
           vs.user_id,
           vs.created_at,
           vs.updated_at,
           vs.last_intent,
           vs.last_user_text,
           vs.last_response_text,
           COUNT(vm.id) AS message_count
         FROM voice_sessions vs
         LEFT JOIN voice_messages vm ON vm.session_id = vs.id
         GROUP BY
           vs.id,
           vs.user_id,
           vs.created_at,
           vs.updated_at,
           vs.last_intent,
           vs.last_user_text,
           vs.last_response_text
         ORDER BY vs.updated_at DESC
         LIMIT ?`,
      )
      .bind(safeLimit)
      .all();

    const sessions = (results || []).map((row: any) => ({
      ...row,
      message_count: Number(row.message_count || 0),
    })) as VoiceSessionSummary[];

    return c.json({ sessions });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/api/admin/voice-sessions/:sessionId/messages', requireAdmin, async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const { results } = await c.env.DB
      .prepare(
        `SELECT id, session_id, user_id, role, text, intent, created_at
         FROM voice_messages
         WHERE session_id = ?
         ORDER BY created_at ASC, id ASC`,
      )
      .bind(sessionId)
      .all();

    return c.json({ messages: (results || []) as VoiceMessage[] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ── ADMIN: Support Tickets Admin View (FR15) ─────────────────────────────────────

// GET /api/admin/tickets - List ALL tickets (admin)
app.get('/api/admin/tickets', requireAdmin, async (c) => {
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
app.patch('/api/admin/tickets/:id/status', requireAdmin, async (c) => {
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
    return c.json({ message: 'Đã cập nhật trạng thái phiếu hỗ trợ' });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ADMIN: Fix double-encoded Unicode in specs/reviews
app.post('/admin/fix-unicode', requireAdmin, async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT id, name, specs, reviews FROM products WHERE specs IS NOT NULL
    `).all();

    let fixed = 0;
    for (const row of results as any[]) {
      const id = row.id;
      let specsFixed = row.specs;
      let reviewsFixed = row.reviews;

      // Check for Unicode escape sequences (backslash + u)
      if (specsFixed && specsFixed.includes('\\u')) {
        try {
          // Decode \uXXXX sequences to actual Unicode characters
          specsFixed = specsFixed.replace(/\\u([0-9a-fA-F]{4})/g, (_: string, code: string) => 
            String.fromCharCode(parseInt(code, 16))
          );
        } catch (e) {
          console.error('Failed to fix specs for', id, e);
        }
      }

      if (reviewsFixed && reviewsFixed.includes('\\u')) {
        try {
          reviewsFixed = reviewsFixed.replace(/\\u([0-9a-fA-F]{4})/g, (_: string, code: string) => 
            String.fromCharCode(parseInt(code, 16))
          );
        } catch (e) {
          console.error('Failed to fix reviews for', id, e);
        }
      }

      if (specsFixed !== row.specs || reviewsFixed !== row.reviews) {
        await c.env.DB.prepare(`
          UPDATE products SET specs = ?, reviews = ? WHERE id = ?
        `).bind(specsFixed, reviewsFixed, id).run();
        fixed++;
      }
    }

    return c.json({ message: `Fixed ${fixed} products`, fixed });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ── CRON TASKS ───────────────────────────────────────────────────────────────

async function updateOrderStatuses(env: Bindings) {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  const { results: toShip } = await env.DB.prepare(
    `UPDATE orders SET status = 'shipped', updated_at = ? 
     WHERE status IN ('confirmed', 'preparing') AND created_at <= ? AND created_at > ?
     RETURNING id`
  ).bind(now.toISOString(), oneHourAgo.toISOString(), twoHoursAgo.toISOString()).all();

  const { results: toDeliver } = await env.DB.prepare(
    `UPDATE orders SET status = 'delivered', updated_at = ? 
     WHERE status = 'shipped' AND created_at <= ?
     RETURNING id`
  ).bind(now.toISOString(), twoHoursAgo.toISOString()).all();

  await env.DB.prepare(
    `UPDATE orders SET status = 'preparing', updated_at = ? 
     WHERE status = 'confirmed' AND created_at > ?`
  ).bind(now.toISOString(), oneHourAgo.toISOString()).run();

  return {
    shipped: toShip?.length || 0,
    delivered: toDeliver?.length || 0,
    timestamp: now.toISOString()
  };
}

app.post('/cron/update-order-statuses', async (c) => {
  try {
    const result = await updateOrderStatuses(c.env);
    return c.json({ 
      message: 'Đã cập nhật trạng thái các đơn hàng',
      ...result
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Bindings, _ctx: ExecutionContext) {
    console.log('Running scheduled task: update-order-statuses');
    try {
      const result = await updateOrderStatuses(env);
      console.log('Scheduled task completed:', result);
    } catch (error) {
      console.error('Scheduled task failed:', error);
    }
  }
};
