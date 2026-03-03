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

// GET /api/products - List all products
app.get('/api/products', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT id, name, price, category, brand, description, images, specs, reviews, url FROM products LIMIT 100'
    ).all();
    return c.json({ products: results });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/products/:id - Get single product
app.get('/api/products/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT id, name, price, category, brand, description, images, specs, reviews, url FROM products WHERE id = ?'
    ).bind(id).all();
    
    if (results.length === 0) {
      return c.json({ error: 'Product not found' }, 404);
    }
    return c.json({ product: results[0] });
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
        username: user.username
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
    const { email, username, password } = await c.req.json();
    
    if (!email || !username || !password) {
      return c.json({ error: 'email, username, and password are required' }, 400);
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
    // For demo, using simple hash
    const passwordHash = password; // In production: await bcrypt.hash(password, 10)
    
    await c.env.DB.prepare(
      'INSERT INTO users (id, email, username, password, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, email, username, passwordHash, now).run();

    return c.json({ 
      id, 
      email, 
      username,
      message: 'User registered successfully' 
    }, 201);
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

// Export the app
export default app;
