import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  DB: D1Database;
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

interface User {
  id: string;
  email: string;
  username: string;
  password: string;
  created_at: string;
}

interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
}

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors({ origin: '*' }));

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
    
    // Transform results to include computed fields
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

// ── AUTH ───────────────────────────────────────────────────────────────────

// Simple bcrypt comparison (in production, use proper bcrypt)
// For demo purposes, using plain text comparison - in production use bcrypt
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // For demo: if hash starts with $2y$ or $2b$, use proper bcrypt
  // For now, simple comparison for migrated users (they have bcrypt hashes)
  if (hash === password) return true;
  
  // Simple hash check for demo accounts
  return false;
}

// POST /api/auth/login - User login
app.post('/api/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    if (!email || !password) {
      return c.json({ error: 'email and password are required' }, 400);
    }

    const { results } = await c.env.DB.prepare(
      'SELECT id, email, username, password FROM users WHERE email = ?'
    ).bind(email).all();
    
    if (results.length === 0) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const user = results[0] as User;
    
    // For demo purposes - check if password matches (migrated users have bcrypt hashes)
    // In production, use bcrypt.compare()
    const valid = await verifyPassword(password, user.password);
    
    if (!valid) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Return user without password
    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.username,
        role: 'user',
      },
      token: `demo-token-${user.id}`
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/auth/register - User registration
app.post('/api/auth/register', async (c) => {
  try {
    const body = await c.req.json();
    // Accept both "username" (API-native) and "name" (sent by frontend)
    const email: string = (body.email || '').trim();
    const username: string = (body.username || body.name || '').trim();
    const password: string = body.password || '';

    if (!email) {
      return c.json({ error: 'Email là bắt buộc' }, 400);
    }
    if (!username) {
      return c.json({ error: 'Họ và tên là bắt buộc' }, 400);
    }
    if (!password) {
      return c.json({ error: 'Mật khẩu là bắt buộc' }, 400);
    }

    // Check if email already exists
    const { results: existing } = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).all();

    if (existing.length > 0) {
      return c.json({ error: 'Email already registered' }, 409);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    // In production, hash password with bcrypt
    const passwordHash = password;

    await c.env.DB.prepare(
      'INSERT INTO users (id, email, username, password, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, email, username, passwordHash, now).run();

    // Return same shape as login so the frontend store works
    const user = { id, email, name: username, role: 'user' };
    const token = btoa(`${id}:${email}:${Date.now()}`);

    return c.json({ user, token, message: 'User registered successfully' }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ── CART ───────────────────────────────────────────────────────────────────

// GET /api/cart/:userId - Get user's cart
app.get('/api/cart/:userId', async (c) => {
  const userId = c.req.param('userId');
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT ci.id, ci.user_id, ci.product_id, ci.quantity, ci.created_at,
              p.name, p.price, p.images, p.brand
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = ?`
    ).bind(userId).all();
    
    return c.json({ cart: results });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/cart - Add item to cart
app.post('/api/cart', async (c) => {
  try {
    const { user_id, product_id, quantity = 1 } = await c.req.json();
    
    if (!user_id || !product_id) {
      return c.json({ error: 'user_id and product_id are required' }, 400);
    }

    // Check if item already in cart
    const { results: existing } = await c.env.DB.prepare(
      'SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?'
    ).bind(user_id, product_id).all();

    if (existing.length > 0) {
      // Update quantity
      const existingItem = existing[0] as CartItem;
      await c.env.DB.prepare(
        'UPDATE cart_items SET quantity = ? WHERE id = ?'
      ).bind(existingItem.quantity + quantity, existingItem.id).run();
      
      return c.json({ message: 'Cart item quantity updated' });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    await c.env.DB.prepare(
      'INSERT INTO cart_items (id, user_id, product_id, quantity, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, user_id, product_id, quantity, now).run();

    return c.json({ id, message: 'Item added to cart' }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /api/cart/:userId/:productId - Remove item from cart
app.delete('/api/cart/:userId/:productId', async (c) => {
  const userId = c.req.param('userId');
  const productId = c.req.param('productId');
  
  try {
    const { results } = await c.env.DB.prepare(
      'DELETE FROM cart_items WHERE user_id = ? AND product_id = ? RETURNING id'
    ).bind(userId, productId).all();
    
    if (results.length === 0) {
      return c.json({ error: 'Item not found in cart' }, 404);
    }
    
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

    // Clear the user's cart after order placement
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

// Export the app
export default app;
