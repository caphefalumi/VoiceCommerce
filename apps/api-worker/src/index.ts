import { Hono } from 'hono';
import { cors } from 'hono/cors';
import {
  buildClearSessionCookie,
  buildGoogleOAuthUrl,
  buildSessionCookie,
  consumeEmailVerifyToken,
  consumeOAuthState,
  consumeResetToken,
  createCredentialUser,
  createEmailVerifyToken,
  createOAuthState,
  createSession,
  exchangeGoogleCode,
  findCredentialAccountByEmail,
  findUserByEmail,
  getSessionFromRequest,
  hashPassword,
  readBearerToken,
  storeResetToken,
  type SimpleAuthEnv,
  verifyPassword,
  upsertGoogleUser,
} from './lib/simple-auth';
import { verifyFirebaseToken, getFirebaseApiKey, signInWithEmailPassword, signUpWithEmailPassword, sendPasswordResetEmail } from './lib/firebase';
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
  BETTER_AUTH_URL: string;
  MAILERSEND_API_KEY: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  FIREBASE_API_KEY: string;
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

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use('*', cors({
  origin: (origin) => {
    if (!origin || 
        origin === 'https://tgdd-frontend.pages.dev' || 
        origin === 'http://localhost:5173' ||
        origin.startsWith('file://') ||
        origin.includes('android')) {
      return origin || '*';
    }
    return '*';
  },
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

const APP_BASE_URL = 'https://api-worker.dangduytoan13l.workers.dev';

function getBaseUrl(c: { env: Bindings }) {
  return c.env.BETTER_AUTH_URL || APP_BASE_URL;
}

async function ensureUserExistsByEmail(c: { env: Bindings }, email: string, fallbackName?: string) {
  const existing = await findUserByEmail(c.env, email);
  if (existing) return existing;

  const userId = crypto.randomUUID();
  const accountId = crypto.randomUUID();
  const now = Date.now();

  await c.env.DB.prepare(
    `INSERT INTO "user" (id, name, email, email_verified, role, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(userId, fallbackName || email.split('@')[0], email.toLowerCase().trim(), 1, 'user', now, now).run();

  await c.env.DB.prepare(
    `INSERT INTO account (id, account_id, provider_id, user_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).bind(accountId, email.toLowerCase().trim(), 'firebase', userId, now, now).run();

  return {
    id: userId,
    email: email.toLowerCase().trim(),
    name: fallbackName || email.split('@')[0],
    role: 'user',
    emailVerified: true,
  };
}

app.get('/api/auth/get-session', async (c) => {
  const session = await getSessionFromRequest(c.env, c.req.raw);
  if (!session) {
    return c.json({ user: null, token: null }, 401);
  }
  return c.json({ user: session.user, token: session.token });
});

app.post('/api/auth/sign-in/email', async (c) => {
  let body: { email?: string; password?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const email = body.email?.toLowerCase().trim();
  const password = body.password ?? '';
  if (!email || !password) {
    return c.json({ error: 'email and password are required' }, 400);
  }

  const account = await findCredentialAccountByEmail(c.env, email);
  if (!account || typeof account.password !== 'string') {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const ok = await verifyPassword(account.password, password);
  if (!ok) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const user = await findUserByEmail(c.env, email);
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  const token = await createSession(c.env, user.id);
  c.header('Set-Cookie', buildSessionCookie(token));
  return c.json({ user, token });
});

app.post('/api/auth/sign-up/email', async (c) => {
  let body: { name?: string; email?: string; password?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const name = body.name?.trim();
  const email = body.email?.toLowerCase().trim();
  const password = body.password ?? '';
  if (!name || !email || !password) {
    return c.json({ error: 'name, email and password are required' }, 400);
  }
  if (password.length < 6) {
    return c.json({ error: 'Password must be at least 6 characters' }, 400);
  }

  const existing = await findUserByEmail(c.env, email);
  if (existing) {
    return c.json({ error: 'Email already registered' }, 409);
  }

  const user = await createCredentialUser(c.env, name, email, password);
  const token = await createSession(c.env, user.id);
  c.header('Set-Cookie', buildSessionCookie(token));
  return c.json({ user, token });
});

app.post('/api/auth/sign-out', async (c) => {
  const token = readBearerToken(c.req.raw);
  if (token) {
    await c.env.DB.prepare('DELETE FROM session WHERE token = ?').bind(token).run();
  }
  c.header('Set-Cookie', buildClearSessionCookie());
  return c.json({ success: true });
});

app.patch('/api/auth/user', requireAuth, async (c) => {
  const user = c.get('user');
  let body: { name?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }
  const name = body.name?.trim();
  if (!name) {
    return c.json({ error: 'name is required' }, 400);
  }

  await c.env.DB.prepare('UPDATE "user" SET name = ?, updated_at = ? WHERE id = ?')
    .bind(name, Date.now(), user.id)
    .run();

  const updated = await findUserByEmail(c.env, user.email);
  if (!updated) {
    return c.json({ error: 'User not found after update' }, 500);
  }
  return c.json({ user: updated });
});

app.post('/api/auth/forget-password', async (c) => {
  let body: { email?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const email = body.email?.toLowerCase().trim();
  if (!email) {
    return c.json({ error: 'email is required' }, 400);
  }

  const user = await findUserByEmail(c.env, email);
  if (user) {
    const token = await storeResetToken(c.env, email);
    const resetUrl = `${getBaseUrl(c)}/reset-password?token=${encodeURIComponent(token)}`;
    console.log(`[auth] password reset URL for ${email}: ${resetUrl}`);
  }

  return c.json({ success: true, message: 'If the email exists, a reset link has been generated.' });
});

app.post('/api/auth/reset-password', async (c) => {
  let body: { token?: string; newPassword?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const token = body.token?.trim();
  const newPassword = body.newPassword ?? '';
  if (!token || !newPassword) {
    return c.json({ error: 'token and newPassword are required' }, 400);
  }
  if (newPassword.length < 6) {
    return c.json({ error: 'Password must be at least 6 characters' }, 400);
  }

  const email = await consumeResetToken(c.env, token);
  if (!email) {
    return c.json({ error: 'Invalid or expired reset token' }, 400);
  }

  const newHash = await hashPassword(newPassword);
  await c.env.DB.prepare(
    `UPDATE account
     SET password = ?, updated_at = ?
     WHERE provider_id = 'credential' AND account_id = ?`,
  ).bind(newHash, Date.now(), email).run();

  return c.json({ success: true });
});

app.get('/api/auth/verify-email', async (c) => {
  const token = c.req.query('token');
  if (!token) {
    return c.json({ error: 'token is required' }, 400);
  }
  const email = await consumeEmailVerifyToken(c.env, token);
  if (!email) {
    return c.json({ error: 'Invalid or expired verification token' }, 400);
  }

  await c.env.DB.prepare('UPDATE "user" SET email_verified = 1, updated_at = ? WHERE email = ?')
    .bind(Date.now(), email)
    .run();

  return c.json({ success: true });
});

app.post('/api/auth/request-verify-email', requireAuth, async (c) => {
  const user = c.get('user');
  const token = await createEmailVerifyToken(c.env, user.email);
  const verifyUrl = `${getBaseUrl(c)}/verify-email?token=${encodeURIComponent(token)}`;
  console.log(`[auth] verify email URL for ${user.email}: ${verifyUrl}`);
  return c.json({ success: true });
});

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// ── MOBILE OAUTH HELPERS ────────────────────────────────────────────────────

// GET /api/mobile/google-url?callbackURL=tgdd://oauth
app.get('/api/mobile/google-url', async (c) => {
  try {
    const callbackURL = c.req.query('callbackURL') || 'tgdd://oauth';
    const state = await createOAuthState(c.env, callbackURL);
    const redirectUri = `${getBaseUrl(c)}/api/mobile/google-bridge`;
    const url = buildGoogleOAuthUrl({
      clientId: c.env.GOOGLE_CLIENT_ID,
      redirectUri,
      state,
    });
    return c.json({ url });
  } catch (e: any) {
    console.error('[mobile/google-url]', e);
    return c.json({ error: e?.message ?? 'Failed to generate OAuth URL' }, 500);
  }
});

// GET /api/mobile/google-bridge?code=...&state=...
// Redirects from Google back to either Android deep link or web callback page.
app.get('/api/mobile/google-bridge', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  if (!code || !state) {
    return c.json({ error: 'Missing code or state parameter' }, 400);
  }

  const callbackURL = await consumeOAuthState(c.env, state);
  if (!callbackURL) {
    return c.json({ error: 'Invalid or expired OAuth state' }, 400);
  }

  const redirectUrl = new URL(callbackURL);
  redirectUrl.searchParams.set('code', code);
  redirectUrl.searchParams.set('state', state);
  return c.redirect(redirectUrl.toString(), 302);
});

// GET /api/mobile/google-callback?code=...&state=...
app.get('/api/mobile/google-callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  if (!code || !state) {
    return c.json({ error: 'Missing code or state parameter' }, 400);
  }

  try {
    const redirectUri = `${getBaseUrl(c)}/api/mobile/google-bridge`;
    const profile = await exchangeGoogleCode({
      code,
      clientId: c.env.GOOGLE_CLIENT_ID,
      clientSecret: c.env.GOOGLE_CLIENT_SECRET,
      redirectUri,
    });

    const user = await upsertGoogleUser(c.env, profile);
    const token = await createSession(c.env, user.id);

    return c.json({ token, user });
  } catch (e: any) {
    console.error('[mobile/google-callback]', e);
    return c.json({ error: e?.message ?? 'OAuth callback failed' }, 500);
  }
});

// POST /api/auth/firebase
// Body: { idToken: string }
app.post('/api/auth/firebase', async (c) => {
  let body: { idToken?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.idToken) {
    return c.json({ error: 'idToken is required' }, 400);
  }

  try {
    const apiKey = getFirebaseApiKey(c.env);
    const firebaseUser = await verifyFirebaseToken(body.idToken, apiKey);
    if (!firebaseUser.email) {
      return c.json({ error: 'Firebase user has no email' }, 400);
    }

    const user = await ensureUserExistsByEmail(c, firebaseUser.email, firebaseUser.displayName || undefined);
    const token = await createSession(c.env, user.id);
    return c.json({ token, user });
  } catch (e: any) {
    console.error('[auth/firebase]', e);
    return c.json({ error: e?.message ?? 'Firebase authentication failed' }, 500);
  }
});

// POST /api/auth/firebase/email
app.post('/api/auth/firebase/email', async (c) => {
  let body: { email?: string; password?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.email || !body.password) {
    return c.json({ error: 'email and password are required' }, 400);
  }

  try {
    const apiKey = getFirebaseApiKey(c.env);
    const firebaseUser = await signInWithEmailPassword(body.email, body.password, apiKey);
    const user = await ensureUserExistsByEmail(c, body.email, firebaseUser.displayName || undefined);
    const token = await createSession(c.env, user.id);
    return c.json({ token, user, needsVerification: !firebaseUser.emailVerified });
  } catch (e: any) {
    console.error('[auth/firebase/email]', e);
    return c.json({ error: e?.message ?? 'Firebase email sign-in failed' }, 500);
  }
});

// POST /api/auth/firebase/email/signup
app.post('/api/auth/firebase/email/signup', async (c) => {
  let body: { name?: string; email?: string; password?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.name || !body.email || !body.password) {
    return c.json({ error: 'name, email and password are required' }, 400);
  }

  try {
    const apiKey = getFirebaseApiKey(c.env);
    await signUpWithEmailPassword(body.email, body.password, body.name, apiKey);
    const user = await ensureUserExistsByEmail(c, body.email, body.name);
    const token = await createSession(c.env, user.id);
    return c.json({ token, user });
  } catch (e: any) {
    console.error('[auth/firebase/email/signup]', e);
    return c.json({ error: e?.message ?? 'Firebase email sign-up failed' }, 500);
  }
});

// POST /api/auth/firebase/reset-password
app.post('/api/auth/firebase/reset-password', async (c) => {
  let body: { email?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.email) {
    return c.json({ error: 'email is required' }, 400);
  }

  try {
    const apiKey = getFirebaseApiKey(c.env);
    await sendPasswordResetEmail(body.email, apiKey);
    return c.json({ message: 'Password reset email sent' });
  } catch (e: any) {
    console.error('[auth/firebase/reset-password]', e);
    return c.json({ error: e?.message ?? 'Firebase password reset failed' }, 500);
  }
});

// POST /api/auth/firebase/create-account
app.post('/api/auth/firebase/create-account', async (c) => {
  let body: { name?: string; email?: string; password?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.name || !body.email || !body.password) {
    return c.json({ error: 'name, email and password are required' }, 400);
  }

  try {
    const apiKey = getFirebaseApiKey(c.env);
    await signUpWithEmailPassword(body.email, body.password, body.name, apiKey);
    const user = await ensureUserExistsByEmail(c, body.email, body.name);
    const token = await createSession(c.env, user.id);
    return c.json({ token, user });
  } catch (e: any) {
    console.error('[auth/firebase/create-account]', e);
    return c.json({ error: e?.message ?? 'Firebase account creation failed' }, 500);
  }
});

// ── PRODUCTS ───────────────────────────────────────────────────────────────────

// GET /api/products - List all products with filtering
app.get('/api/products', async (c) => {
  try {
    const { category, search, minPrice, maxPrice, brand, minRating, inStock, sort } = c.req.query();
    
    let query = 'SELECT id, name, price, original_price, category, brand, rating, review_count, stock, description, images, specs, reviews, url, created_at FROM products WHERE 1=1';
    const params: any[] = [];
    
    if (category && category.trim() !== '') {
      query += ' AND LOWER(category) = LOWER(?)';
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
    
    // New filters for Android app
    if (brand && brand.trim() !== '') {
      const brands = brand.split(',').map(b => b.trim());
      const brandPlaceholders = brands.map(() => '?').join(',');
      query += ` AND brand IN (${brandPlaceholders})`;
      params.push(...brands);
    }
    
    if (minRating && minRating.trim() !== '') {
      query += ' AND rating >= ?';
      params.push(parseFloat(minRating));
    }
    
    if (inStock === 'true') {
      query += ' AND stock > 0';
    }
    
    // Sorting
    const sortMap: Record<string, string> = {
      'price_asc': 'price ASC',
      'price_desc': 'price DESC',
      'rating_desc': 'rating DESC',
      'newest': 'created_at DESC',
      'name_asc': 'name ASC',
      'relevance': 'rating DESC, review_count DESC',
    };
    
    const orderBy = sortMap[sort || 'relevance'] || 'rating DESC, review_count DESC';
    query += ` ORDER BY ${orderBy}`;
    
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

// PATCH /api/cart/:productId - Set item quantity in cart
app.patch('/api/cart/:productId', requireAuth, async (c) => {
  const user = c.get('user');
  const productId = c.req.param('productId');
  try {
    const { quantity } = await c.req.json();
    const nextQuantity = Number(quantity);

    if (!Number.isInteger(nextQuantity) || nextQuantity < 0) {
      return c.json({ error: 'quantity must be a non-negative integer' }, 400);
    }

    if (nextQuantity === 0) {
      const { results } = await c.env.DB.prepare(
        'DELETE FROM cart_items WHERE user_id = ? AND product_id = ? RETURNING id'
      ).bind(user.id, productId).all();

      if (results.length === 0) {
        return c.json({ error: 'Không tìm thấy sản phẩm trong giỏ hàng' }, 404);
      }

      return c.json({ success: true, message: 'Đã xóa sản phẩm khỏi giỏ hàng' });
    }

    const { results: existing } = await c.env.DB.prepare(
      'SELECT id FROM cart_items WHERE user_id = ? AND product_id = ?'
    ).bind(user.id, productId).all();

    if (existing.length === 0) {
      return c.json({ error: 'Không tìm thấy sản phẩm trong giỏ hàng' }, 404);
    }

    const item = existing[0] as { id: string };

    await c.env.DB.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?')
      .bind(nextQuantity, item.id)
      .run();

    return c.json({ success: true, message: 'Đã cập nhật số lượng sản phẩm trong giỏ hàng' });
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
      id, user_id, 'pending', total_price,
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

// ── STRIPE CHECKOUT ───────────────────────────────────────────────────────────

const STRIPE_API_VERSION = '2024-12-18.acacia';

async function stripeRequest<T = any>(c: any, endpoint: string, options: RequestInit = {}): Promise<T> {
  const stripeKey = c.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  const res = await fetch(`https://api.stripe.com${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': STRIPE_API_VERSION,
      ...options.headers,
    },
  });
  const data = await res.json() as T;
  if (!res.ok) {
    throw new Error((data as any).error?.message || `Stripe error: ${res.status}`);
  }
  return data;
}

// POST /api/create-checkout-session - Create Stripe Checkout session
app.post('/api/create-checkout-session', async (c) => {
  try {
    const { items, user_id, user_email, user_name, success_url, cancel_url } = await c.req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return c.json({ error: 'Items are required' }, 400);
    }

    const total = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    const amount = Math.round(total * 100);

    if (amount <= 0) {
      return c.json({ error: 'Invalid amount' }, 400);
    }

    const lineItems = items.map((item: any) => ({
      'price_data[currency]': 'vnd',
      'price_data[product_data][name]': item.name,
      'price_data[unit_amount]': Math.round(item.price * 100).toString(),
      'price_data[metadata][item_id]': item.id || '',
      'quantity': item.quantity.toString(),
    }));

    const params = new URLSearchParams();
    params.append('payment_method_types[]', 'card');
    params.append('mode', 'payment');
    params.append('success_url', success_url || 'https://tgdd-frontend.pages.dev/checkout-success?session_id={CHECKOUT_SESSION_ID}');
    params.append('cancel_url', cancel_url || 'https://tgdd-frontend.pages.dev/checkout?canceled=true');
    params.append('customer_email', user_email || '');
    params.append('metadata[user_id]', user_id || '');
    params.append('metadata[user_name]', user_name || '');

    items.forEach((item: any, index: number) => {
      params.append(`line_items[${index}][price_data][currency]`, 'vnd');
      params.append(`line_items[${index}][price_data][product_data][name]`, item.name);
      params.append(`line_items[${index}][price_data][unit_amount]`, Math.round(item.price * 100).toString());
      params.append(`line_items[${index}][quantity]`, item.quantity.toString());
    });

    const session = await stripeRequest(c, '/v1/checkout/sessions', {
      method: 'POST',
      body: params.toString(),
    });

    return c.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error('Stripe checkout session error:', error);
    return c.json({ error: error.message || 'Failed to create checkout session' }, 500);
  }
});

// POST /api/webhook - Handle Stripe webhook events
app.post('/api/webhook', async (c) => {
  const signature = c.req.header('stripe-signature');
  if (!signature) {
    return c.json({ error: 'Missing stripe-signature header' }, 400);
  }

  const body = await c.req.text();
  const webhookSecret = c.env.STRIPE_WEBHOOK_SECRET;

  let event: any;
  try {
    const timestamp = signature.split(',').find((s: string) => s.startsWith('t='))?.split('=')[1];
    const sig = signature.split(',').find((s: string) => s.startsWith('v1='))?.split('=')[1];

    if (!timestamp || !sig || !webhookSecret) {
      return c.json({ error: 'Invalid signature format or missing webhook secret' }, 400);
    }

    const payload = `${timestamp}.${body}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const expectedSig = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (expectedSig !== sig) {
      console.error('Webhook signature mismatch');
      return c.json({ error: 'Invalid signature' }, 400);
    }

    event = JSON.parse(body);
  } catch (err: any) {
    console.error('Webhook verification error:', err);
    return c.json({ error: 'Webhook verification failed' }, 400);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    const userId = session.metadata?.user_id;
    const paymentIntentId = session.payment_intent;
    const customerEmail = session.customer_email;

    console.log(`[stripe] Checkout completed: session=${session.id}, user=${userId}, payment=${paymentIntentId}`);

    if (userId) {
      await c.env.DB.prepare(
        `UPDATE orders SET payment_intent_id = ?, payment_status = 'paid', status = 'confirmed', updated_at = ? WHERE user_id = ? AND status = 'preparing' ORDER BY created_at DESC LIMIT 1`
      ).bind(paymentIntentId, new Date().toISOString(), userId).run();
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object as any;
    console.log(`[stripe] Payment failed: ${paymentIntent.id}`);
  }

  return c.json({ received: true });
});

// GET /api/payment-status/:sessionId - Check payment status
app.get('/api/payment-status/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  try {
    const session = await stripeRequest<{ payment_status: string }>(c, `/v1/checkout/sessions/${sessionId}`);
    return c.json({
      status: session.payment_status,
      paymentStatus: session.payment_status,
    });
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

// ── ADDRESSES ─────────────────────────────────────────────────────────────────

// GET /api/addresses/:userId - List user addresses
app.get('/api/addresses/:userId', async (c) => {
  const userId = c.req.param('userId');
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT id, user_id, label, name, phone, street, ward, district, city, is_default, created_at, updated_at
       FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC`
    ).bind(userId).all();
    
    const addresses = (results || []).map((row: any) => ({
      ...row,
      is_default: row.is_default === 1,
    }));
    
    return c.json({ addresses });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/addresses - Create address
app.post('/api/addresses', requireAuth, async (c) => {
  const user = c.get('user');
  try {
    const { label, name, phone, street, ward, district, city, is_default } = await c.req.json();
    
    if (!name || !phone || !street || !city) {
      return c.json({ error: 'name, phone, street, and city are required' }, 400);
    }

    // Validate Vietnamese phone number (10 digits, starts with 0)
    const phoneRegex = /^0\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return c.json({ error: 'Số điện thoại không hợp lệ (phải có 10 số và bắt đầu bằng 0)' }, 400);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const isDefault = is_default ? 1 : 0;
    
    // If setting as default, unset other defaults
    if (isDefault) {
      await c.env.DB.prepare(
        'UPDATE addresses SET is_default = 0 WHERE user_id = ?'
      ).bind(user.id).run();
    }
    
    await c.env.DB.prepare(
      `INSERT INTO addresses (id, user_id, label, name, phone, street, ward, district, city, is_default, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, user.id, label || 'Other', name, phone, street, ward || '', district || '', city, isDefault, now, now).run();

    return c.json({ id, message: 'Đã thêm địa chỉ' }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// PUT /api/addresses/:addressId - Update address
app.put('/api/addresses/:addressId', requireAuth, async (c) => {
  const user = c.get('user');
  const addressId = c.req.param('addressId');
  
  try {
    const { label, name, phone, street, ward, district, city } = await c.req.json();
    
    // Check if address exists and belongs to user
    const { results: addressCheck } = await c.env.DB.prepare(
      'SELECT id, user_id FROM addresses WHERE id = ?'
    ).bind(addressId).all();
    
    if (addressCheck.length === 0) {
      return c.json({ error: 'Không tìm thấy địa chỉ' }, 404);
    }
    
    const address = addressCheck[0] as any;
    if (address.user_id !== user.id) {
      return c.json({ error: 'Bạn không có quyền chỉnh sửa địa chỉ này' }, 403);
    }

    // Validate phone if provided
    if (phone) {
      const phoneRegex = /^0\d{9}$/;
      if (!phoneRegex.test(phone)) {
        return c.json({ error: 'Số điện thoại không hợp lệ (phải có 10 số và bắt đầu bằng 0)' }, 400);
      }
    }

    const now = new Date().toISOString();
    
    await c.env.DB.prepare(
      `UPDATE addresses SET label = COALESCE(?, label), name = COALESCE(?, name),
       phone = COALESCE(?, phone), street = COALESCE(?, street), ward = COALESCE(?, ward),
       district = COALESCE(?, district), city = COALESCE(?, city), updated_at = ? WHERE id = ?`
    ).bind(label, name, phone, street, ward, district, city, now, addressId).run();

    return c.json({ message: 'Đã cập nhật địa chỉ' });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /api/addresses/:addressId - Delete address
app.delete('/api/addresses/:addressId', requireAuth, async (c) => {
  const user = c.get('user');
  const addressId = c.req.param('addressId');
  
  try {
    // Check if address exists and belongs to user
    const { results: addressCheck } = await c.env.DB.prepare(
      'SELECT id, user_id FROM addresses WHERE id = ?'
    ).bind(addressId).all();
    
    if (addressCheck.length === 0) {
      return c.json({ error: 'Không tìm thấy địa chỉ' }, 404);
    }
    
    const address = addressCheck[0] as any;
    if (address.user_id !== user.id) {
      return c.json({ error: 'Bạn không có quyền xóa địa chỉ này' }, 403);
    }

    await c.env.DB.prepare('DELETE FROM addresses WHERE id = ?').bind(addressId).run();

    return c.json({ message: 'Đã xóa địa chỉ' });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// PATCH /api/addresses/:addressId/default - Set as default address
app.patch('/api/addresses/:addressId/default', requireAuth, async (c) => {
  const user = c.get('user');
  const addressId = c.req.param('addressId');
  
  try {
    // Check if address exists and belongs to user
    const { results: addressCheck } = await c.env.DB.prepare(
      'SELECT id, user_id FROM addresses WHERE id = ?'
    ).bind(addressId).all();
    
    if (addressCheck.length === 0) {
      return c.json({ error: 'Không tìm thấy địa chỉ' }, 404);
    }
    
    const address = addressCheck[0] as any;
    if (address.user_id !== user.id) {
      return c.json({ error: 'Bạn không có quyền thay đổi địa chỉ này' }, 403);
    }

    // Unset all defaults for this user
    await c.env.DB.prepare(
      'UPDATE addresses SET is_default = 0 WHERE user_id = ?'
    ).bind(user.id).run();

    // Set this address as default
    await c.env.DB.prepare(
      'UPDATE addresses SET is_default = 1 WHERE id = ?'
    ).bind(addressId).run();

    return c.json({ message: 'Đã đặt làm địa chỉ mặc định' });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ── PROMO CODES ───────────────────────────────────────────────────────────────

// POST /api/promo-codes/validate - Validate promo code
app.post('/api/promo-codes/validate', async (c) => {
  try {
    const { code, user_id, order_total } = await c.req.json();
    
    if (!code) {
      return c.json({ error: 'Mã khuyến mãi là bắt buộc' }, 400);
    }

    // Get promo code
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM promo_codes WHERE code = ? AND is_active = 1'
    ).bind(code.toUpperCase()).all();
    
    if (results.length === 0) {
      return c.json({ valid: false, error: 'Mã khuyến mãi không hợp lệ' }, 404);
    }
    
    const promo = results[0] as any;
    
    // Check expiration
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      return c.json({ valid: false, error: 'Mã khuyến mãi đã hết hạn' }, 400);
    }
    
    // Check usage limit
    if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
      return c.json({ valid: false, error: 'Mã khuyến mãi đã hết lượt sử dụng' }, 400);
    }
    
    // Check minimum order value
    if (order_total && promo.min_order_value && order_total < promo.min_order_value) {
      return c.json({ 
        valid: false, 
        error: `Đơn hàng tối thiểu ${promo.min_order_value.toLocaleString('vi-VN')} VND` 
      }, 400);
    }
    
    // Check if user already used this code
    if (user_id) {
      const { results: usageCheck } = await c.env.DB.prepare(
        'SELECT id FROM promo_code_usage WHERE promo_code_id = ? AND user_id = ?'
      ).bind(promo.id, user_id).all();
      
      if (usageCheck.length > 0) {
        return c.json({ valid: false, error: 'Bạn đã sử dụng mã này rồi' }, 400);
      }
    }
    
    // Calculate discount
    let discount = 0;
    if (promo.discount_type === 'percentage') {
      discount = (order_total || 0) * (promo.discount_value / 100);
      if (promo.max_discount && discount > promo.max_discount) {
        discount = promo.max_discount;
      }
    } else {
      discount = promo.discount_value;
    }
    
    return c.json({
      valid: true,
      promo_code: {
        id: promo.id,
        code: promo.code,
        discount_type: promo.discount_type,
        discount_value: promo.discount_value,
        discount_amount: discount,
        min_order_value: promo.min_order_value,
        max_discount: promo.max_discount,
      }
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/promo-codes/apply - Apply promo code to order
app.post('/api/promo-codes/apply', requireAuth, async (c) => {
  const user = c.get('user');
  try {
    const { code, order_id } = await c.req.json();
    
    if (!code || !order_id) {
      return c.json({ error: 'code and order_id are required' }, 400);
    }

    // Get promo code
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM promo_codes WHERE code = ? AND is_active = 1'
    ).bind(code.toUpperCase()).all();
    
    if (results.length === 0) {
      return c.json({ error: 'Mã khuyến mãi không hợp lệ' }, 404);
    }
    
    const promo = results[0] as any;
    
    // Record usage
    const usageId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    await c.env.DB.prepare(
      'INSERT INTO promo_code_usage (id, promo_code_id, user_id, order_id, used_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(usageId, promo.id, user.id, order_id, now).run();
    
    // Increment usage count
    await c.env.DB.prepare(
      'UPDATE promo_codes SET usage_count = usage_count + 1 WHERE id = ?'
    ).bind(promo.id).run();

    return c.json({ message: 'Đã áp dụng mã khuyến mãi' });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/promo-codes - List available promo codes (admin)
app.get('/api/promo-codes', requireAdmin, async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM promo_codes ORDER BY created_at DESC'
    ).all();
    
    const promoCodes = (results || []).map((row: any) => ({
      ...row,
      is_active: row.is_active === 1,
    }));
    
    return c.json({ promo_codes: promoCodes });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/promo-codes - Create promo code (admin)
app.post('/api/promo-codes', requireAdmin, async (c) => {
  try {
    const { code, discount_type, discount_value, min_order_value, max_discount, usage_limit, expires_at } = await c.req.json();
    
    if (!code || !discount_type || !discount_value) {
      return c.json({ error: 'code, discount_type, and discount_value are required' }, 400);
    }
    
    if (!['percentage', 'fixed'].includes(discount_type)) {
      return c.json({ error: 'discount_type must be percentage or fixed' }, 400);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    await c.env.DB.prepare(
      `INSERT INTO promo_codes (id, code, discount_type, discount_value, min_order_value, max_discount, usage_limit, expires_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, code.toUpperCase(), discount_type, discount_value, min_order_value || 0, max_discount || null, usage_limit || null, expires_at || null, now, now).run();

    return c.json({ id, message: 'Đã tạo mã khuyến mãi' }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

type BuiltInCoupon = {
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_value: number;
  max_discount: number | null;
  description: string;
};

const BUILT_IN_COUPONS: Record<string, BuiltInCoupon> = {
  FLASHSALE: {
    code: 'FLASHSALE',
    discount_type: 'percentage',
    discount_value: 10,
    min_order_value: 1_000_000,
    max_discount: 500_000,
    description: 'Flash sale giảm 10% tối đa 500.000 VND',
  },
  BLACKFRIDAY: {
    code: 'BLACKFRIDAY',
    discount_type: 'percentage',
    discount_value: 20,
    min_order_value: 2_000_000,
    max_discount: 1_500_000,
    description: 'Black Friday giảm 20% tối đa 1.500.000 VND',
  },
  NEWGUY: {
    code: 'NEWGUY',
    discount_type: 'fixed',
    discount_value: 200_000,
    min_order_value: 500_000,
    max_discount: null,
    description: 'Ưu đãi khách mới giảm trực tiếp 200.000 VND',
  },
};

// POST /api/coupons/apply - Validate and calculate coupon discount for checkout summary
app.post('/api/coupons/apply', async (c) => {
  try {
    const { code, order_total, user_id } = await c.req.json();

    const normalizedCode = (code || '').toString().trim().toUpperCase();
    const orderTotal = Number(order_total ?? 0);

    if (!normalizedCode) {
      return c.json({ success: false, error: 'Mã giảm giá là bắt buộc' }, 400);
    }

    if (!Number.isFinite(orderTotal) || orderTotal <= 0) {
      return c.json({ success: false, error: 'order_total phải lớn hơn 0' }, 400);
    }

    const { results } = await c.env.DB
      .prepare('SELECT * FROM promo_codes WHERE code = ? AND is_active = 1')
      .bind(normalizedCode)
      .all();

    const dbPromo = results.length > 0 ? (results[0] as any) : null;
    const builtInPromo = BUILT_IN_COUPONS[normalizedCode] || null;

    if (!dbPromo && !builtInPromo) {
      return c.json({ success: false, error: 'Mã giảm giá không hợp lệ' }, 404);
    }

    const promo = dbPromo || builtInPromo;

    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      return c.json({ success: false, error: 'Mã giảm giá đã hết hạn' }, 400);
    }

    if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
      return c.json({ success: false, error: 'Mã giảm giá đã hết lượt sử dụng' }, 400);
    }

    if (promo.min_order_value && orderTotal < Number(promo.min_order_value)) {
      return c.json({
        success: false,
        error: `Đơn hàng tối thiểu ${Number(promo.min_order_value).toLocaleString('vi-VN')} VND để dùng mã này`,
      }, 400);
    }

    if (dbPromo && user_id) {
      const { results: usageCheck } = await c.env.DB
        .prepare('SELECT id FROM promo_code_usage WHERE promo_code_id = ? AND user_id = ?')
        .bind(promo.id, user_id)
        .all();

      if (usageCheck.length > 0) {
        return c.json({ success: false, error: 'Bạn đã sử dụng mã này rồi' }, 400);
      }
    }

    let discountAmount = 0;
    if (promo.discount_type === 'percentage') {
      discountAmount = orderTotal * (Number(promo.discount_value) / 100);
      if (promo.max_discount && discountAmount > Number(promo.max_discount)) {
        discountAmount = Number(promo.max_discount);
      }
    } else {
      discountAmount = Number(promo.discount_value);
    }

    discountAmount = Math.max(0, Math.min(discountAmount, orderTotal));
    const finalTotal = Math.max(0, orderTotal - discountAmount);

    return c.json({
      success: true,
      coupon_code: normalizedCode,
      discount_type: promo.discount_type,
      discount_value: Number(promo.discount_value),
      subtotal: orderTotal,
      discount_amount: discountAmount,
      final_total: finalTotal,
      description: promo.description || null,
      message: `Áp dụng ${normalizedCode} thành công. Giảm ${discountAmount.toLocaleString('vi-VN')} VND.`,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ── SEARCH HISTORY ────────────────────────────────────────────────────────────

// GET /api/search-history/:userId - Get user's search history
app.get('/api/search-history/:userId', async (c) => {
  const userId = c.req.param('userId');
  const limit = parseInt(c.req.query('limit') || '20');
  
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT id, user_id, query, results_count, created_at FROM search_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
    ).bind(userId, limit).all();
    
    return c.json({ search_history: results || [] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/search-history - Save search
app.post('/api/search-history', async (c) => {
  try {
    const { user_id, query, results_count } = await c.req.json();
    
    if (!user_id || !query) {
      return c.json({ error: 'user_id and query are required' }, 400);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    await c.env.DB.prepare(
      'INSERT INTO search_history (id, user_id, query, results_count, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, user_id, query, results_count || 0, now).run();

    return c.json({ id, message: 'Đã lưu lịch sử tìm kiếm' }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /api/search-history/:searchId - Delete search
app.delete('/api/search-history/:searchId', async (c) => {
  const searchId = c.req.param('searchId');
  const userId = c.req.query('user_id');
  
  if (!userId) {
    return c.json({ error: 'user_id query parameter is required' }, 400);
  }
  
  try {
    const { results } = await c.env.DB.prepare(
      'DELETE FROM search_history WHERE id = ? AND user_id = ? RETURNING id'
    ).bind(searchId, userId).all();
    
    if (results.length === 0) {
      return c.json({ error: 'Không tìm thấy lịch sử tìm kiếm' }, 404);
    }
    
    return c.json({ message: 'Đã xóa lịch sử tìm kiếm' });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /api/search-history/:userId/all - Clear all search history
app.delete('/api/search-history/:userId/all', async (c) => {
  const userId = c.req.param('userId');
  
  try {
    await c.env.DB.prepare(
      'DELETE FROM search_history WHERE user_id = ?'
    ).bind(userId).run();
    
    return c.json({ message: 'Đã xóa toàn bộ lịch sử tìm kiếm' });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/search/suggestions - Get search suggestions
app.get('/api/search/suggestions', async (c) => {
  const query = c.req.query('q') || '';
  const limit = parseInt(c.req.query('limit') || '10');
  
  if (!query || query.length < 2) {
    return c.json({ suggestions: [] });
  }
  
  try {
    // Get product name suggestions
    const { results } = await c.env.DB.prepare(
      `SELECT DISTINCT name FROM products WHERE name LIKE ? LIMIT ?`
    ).bind(`%${query}%`, limit).all();
    
    const suggestions = (results || []).map((row: any) => row.name);
    
    return c.json({ suggestions });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ── REVIEWS ───────────────────────────────────────────────────────────────────

// GET /api/products/:productId/reviews - Get product reviews
app.get('/api/products/:productId/reviews', async (c) => {
  const productId = c.req.param('productId');
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT r.id, r.product_id, r.user_id, r.rating, r.comment, r.images,
              r.verified_purchase, r.helpful_count, r.created_at, r.updated_at,
              u.name as user_name, u.email as user_email
       FROM reviews r
       LEFT JOIN "user" u ON r.user_id = u.id
       WHERE r.product_id = ?
       ORDER BY r.created_at DESC`
    ).bind(productId).all();
    
    const reviews = (results || []).map((row: any) => ({
      ...row,
      images: row.images ? JSON.parse(row.images) : [],
      verified_purchase: row.verified_purchase === 1,
    }));
    
    return c.json({ reviews });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/products/:productId/reviews - Submit review
app.post('/api/products/:productId/reviews', requireAuth, async (c) => {
  const user = c.get('user');
  const productId = c.req.param('productId');
  
  try {
    const { rating, comment, images } = await c.req.json();
    
    if (!rating || rating < 1 || rating > 5) {
      return c.json({ error: 'Rating must be between 1 and 5' }, 400);
    }

    // Check if product exists
    const { results: productCheck } = await c.env.DB.prepare(
      'SELECT id FROM products WHERE id = ?'
    ).bind(productId).all();
    
    if (productCheck.length === 0) {
      return c.json({ error: 'Sản phẩm không tồn tại' }, 404);
    }

    // Check if user already reviewed this product
    const { results: existingReview } = await c.env.DB.prepare(
      'SELECT id FROM reviews WHERE product_id = ? AND user_id = ?'
    ).bind(productId, user.id).all();
    
    if (existingReview.length > 0) {
      return c.json({ error: 'Bạn đã đánh giá sản phẩm này rồi' }, 400);
    }

    // Check if user purchased this product (verified purchase)
    const { results: orderCheck } = await c.env.DB.prepare(
      `SELECT id FROM orders WHERE user_id = ? AND items LIKE ? AND status = 'delivered'`
    ).bind(user.id, `%${productId}%`).all();
    
    const verifiedPurchase = orderCheck.length > 0 ? 1 : 0;

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const imagesJson = images ? JSON.stringify(images) : '[]';
    
    await c.env.DB.prepare(
      `INSERT INTO reviews (id, product_id, user_id, rating, comment, images, verified_purchase, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, productId, user.id, rating, comment || '', imagesJson, verifiedPurchase, now, now).run();

    // Update product rating and review count
    const { results: stats } = await c.env.DB.prepare(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as review_count FROM reviews WHERE product_id = ?'
    ).bind(productId).all();
    
    if (stats.length > 0) {
      const { avg_rating, review_count } = stats[0] as any;
      await c.env.DB.prepare(
        'UPDATE products SET rating = ?, review_count = ? WHERE id = ?'
      ).bind(avg_rating, review_count, productId).run();
    }

    return c.json({ id, message: 'Đã gửi đánh giá thành công' }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// PUT /api/reviews/:reviewId - Edit review
app.put('/api/reviews/:reviewId', requireAuth, async (c) => {
  const user = c.get('user');
  const reviewId = c.req.param('reviewId');
  
  try {
    const { rating, comment, images } = await c.req.json();
    
    if (rating && (rating < 1 || rating > 5)) {
      return c.json({ error: 'Rating must be between 1 and 5' }, 400);
    }

    // Check if review exists and belongs to user
    const { results: reviewCheck } = await c.env.DB.prepare(
      'SELECT id, product_id, user_id FROM reviews WHERE id = ?'
    ).bind(reviewId).all();
    
    if (reviewCheck.length === 0) {
      return c.json({ error: 'Không tìm thấy đánh giá' }, 404);
    }
    
    const review = reviewCheck[0] as any;
    if (review.user_id !== user.id) {
      return c.json({ error: 'Bạn không có quyền chỉnh sửa đánh giá này' }, 403);
    }

    const now = new Date().toISOString();
    const imagesJson = images ? JSON.stringify(images) : undefined;
    
    await c.env.DB.prepare(
      `UPDATE reviews SET rating = COALESCE(?, rating), comment = COALESCE(?, comment),
       images = COALESCE(?, images), updated_at = ? WHERE id = ?`
    ).bind(rating, comment, imagesJson, now, reviewId).run();

    // Update product rating
    const { results: stats } = await c.env.DB.prepare(
      'SELECT AVG(rating) as avg_rating FROM reviews WHERE product_id = ?'
    ).bind(review.product_id).all();
    
    if (stats.length > 0) {
      const { avg_rating } = stats[0] as any;
      await c.env.DB.prepare(
        'UPDATE products SET rating = ? WHERE id = ?'
      ).bind(avg_rating, review.product_id).run();
    }

    return c.json({ message: 'Đã cập nhật đánh giá' });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /api/reviews/:reviewId - Delete review
app.delete('/api/reviews/:reviewId', requireAuth, async (c) => {
  const user = c.get('user');
  const reviewId = c.req.param('reviewId');
  
  try {
    // Check if review exists and belongs to user
    const { results: reviewCheck } = await c.env.DB.prepare(
      'SELECT id, product_id, user_id FROM reviews WHERE id = ?'
    ).bind(reviewId).all();
    
    if (reviewCheck.length === 0) {
      return c.json({ error: 'Không tìm thấy đánh giá' }, 404);
    }
    
    const review = reviewCheck[0] as any;
    if (review.user_id !== user.id) {
      return c.json({ error: 'Bạn không có quyền xóa đánh giá này' }, 403);
    }

    await c.env.DB.prepare('DELETE FROM reviews WHERE id = ?').bind(reviewId).run();

    // Update product rating and review count
    const { results: stats } = await c.env.DB.prepare(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as review_count FROM reviews WHERE product_id = ?'
    ).bind(review.product_id).all();
    
    if (stats.length > 0) {
      const { avg_rating, review_count } = stats[0] as any;
      await c.env.DB.prepare(
        'UPDATE products SET rating = ?, review_count = ? WHERE id = ?'
      ).bind(avg_rating || 0, review_count, review.product_id).run();
    }

    return c.json({ message: 'Đã xóa đánh giá' });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/reviews/:reviewId/helpful - Mark review as helpful
app.post('/api/reviews/:reviewId/helpful', requireAuth, async (c) => {
  const user = c.get('user');
  const reviewId = c.req.param('reviewId');
  
  try {
    // Check if already marked as helpful
    const { results: existing } = await c.env.DB.prepare(
      'SELECT id FROM review_helpful WHERE review_id = ? AND user_id = ?'
    ).bind(reviewId, user.id).all();
    
    if (existing.length > 0) {
      return c.json({ message: 'Bạn đã đánh dấu hữu ích rồi' }, 200);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    await c.env.DB.prepare(
      'INSERT INTO review_helpful (id, review_id, user_id, created_at) VALUES (?, ?, ?, ?)'
    ).bind(id, reviewId, user.id, now).run();

    // Update helpful count
    await c.env.DB.prepare(
      'UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = ?'
    ).bind(reviewId).run();

    return c.json({ message: 'Đã đánh dấu hữu ích' });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/admin/recalculate-ratings - Recalculate all product ratings from reviews column
app.post('/api/admin/recalculate-ratings', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '100');
    const offset = parseInt(c.req.query('offset') || '0');
    const varyRatings = c.req.query('vary') === 'true';
    
    // Get products in batches
    const { results: products } = await c.env.DB.prepare(
      'SELECT id, reviews FROM products LIMIT ? OFFSET ?'
    ).bind(limit, offset).all();
    
    if (!products || products.length === 0) {
      return c.json({ 
        message: 'Không còn sản phẩm nào để xử lý',
        processed: 0,
        offset: offset
      });
    }
    
    let updated = 0;
    
    // Process in smaller batches to avoid timeout
    const batchSize = 10;
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (product: any) => {
        const reviews = parseReviews(product.reviews || '[]');
        
        if (reviews.length > 0) {
          let avgRating: number;
          
          if (varyRatings) {
            // Vary ratings between 3.0 and 5.0
            avgRating = 3.0 + Math.random() * 2.0; // Random between 3.0 and 5.0
            avgRating = Math.round(avgRating * 10) / 10; // Round to 1 decimal
          } else {
            const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
            avgRating = totalRating / reviews.length;
          }
          
          await c.env.DB.prepare(
            'UPDATE products SET rating = ?, review_count = ? WHERE id = ?'
          ).bind(avgRating, reviews.length, product.id).run();
          updated++;
        } else {
          await c.env.DB.prepare(
            'UPDATE products SET rating = 0, review_count = 0 WHERE id = ?'
          ).bind(product.id).run();
        }
      }));
    }
    
    return c.json({ 
      message: `Đã xử lý ${products.length} sản phẩm (${updated} có đánh giá)`,
      processed: products.length,
      updated,
      offset: offset,
      next_offset: offset + products.length,
      has_more: products.length === limit,
      varied: varyRatings
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/admin/categories - List all unique categories in database
app.get('/api/admin/categories', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != "" ORDER BY category'
    ).all();
    
    const categories = (results || []).map((row: any) => row.category);
    
    return c.json({ categories, count: categories.length });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ── WISHLIST ──────────────────────────────────────────────────────────────────

// GET /api/wishlist/:userId - Get user's wishlist
app.get('/api/wishlist/:userId', async (c) => {
  const userId = c.req.param('userId');
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT w.id, w.user_id, w.product_id, w.created_at,
              p.name, p.price, p.original_price, p.images, p.brand, p.rating, p.stock
       FROM wishlist w
       LEFT JOIN products p ON w.product_id = p.id
       WHERE w.user_id = ?
       ORDER BY w.created_at DESC`
    ).bind(userId).all();
    
    const wishlist = (results || []).map((row: any) => ({
      ...row,
      images: row.images ? JSON.parse(row.images) : [],
      product_exists: row.name !== null,
    })).filter((item: any) => item.product_exists);
    
    return c.json({ wishlist });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/wishlist - Add item to wishlist
app.post('/api/wishlist', async (c) => {
  try {
    const { user_id, product_id } = await c.req.json();
    if (!user_id || !product_id) {
      return c.json({ error: 'user_id and product_id are required' }, 400);
    }

    // Check if product exists
    const { results: productCheck } = await c.env.DB.prepare(
      'SELECT id FROM products WHERE id = ?'
    ).bind(product_id).all();
    
    if (productCheck.length === 0) {
      return c.json({ error: 'Sản phẩm không tồn tại' }, 404);
    }

    // Check if already in wishlist
    const { results: existing } = await c.env.DB.prepare(
      'SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?'
    ).bind(user_id, product_id).all();

    if (existing.length > 0) {
      return c.json({ message: 'Sản phẩm đã có trong danh sách yêu thích' }, 200);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await c.env.DB.prepare(
      'INSERT INTO wishlist (id, user_id, product_id, created_at) VALUES (?, ?, ?, ?)'
    ).bind(id, user_id, product_id, now).run();

    return c.json({ id, message: 'Đã thêm vào danh sách yêu thích' }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /api/wishlist/:productId - Remove item from wishlist
app.delete('/api/wishlist/:productId', async (c) => {
  const productId = c.req.param('productId');
  const userId = c.req.query('user_id');
  
  if (!userId) {
    return c.json({ error: 'user_id query parameter is required' }, 400);
  }
  
  try {
    const { results } = await c.env.DB.prepare(
      'DELETE FROM wishlist WHERE user_id = ? AND product_id = ? RETURNING id'
    ).bind(userId, productId).all();
    
    if (results.length === 0) {
      return c.json({ error: 'Không tìm thấy sản phẩm trong danh sách yêu thích' }, 404);
    }
    
    return c.json({ message: 'Đã xóa khỏi danh sách yêu thích' });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/wishlist/:productId/cart - Move wishlist item to cart
app.post('/api/wishlist/:productId/cart', requireAuth, async (c) => {
  const user = c.get('user');
  const productId = c.req.param('productId');
  
  try {
    // Check if in wishlist
    const { results: wishlistCheck } = await c.env.DB.prepare(
      'SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?'
    ).bind(user.id, productId).all();
    
    if (wishlistCheck.length === 0) {
      return c.json({ error: 'Sản phẩm không có trong danh sách yêu thích' }, 404);
    }

    // Add to cart
    const { results: cartCheck } = await c.env.DB.prepare(
      'SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?'
    ).bind(user.id, productId).all();

    if (cartCheck.length > 0) {
      const existingItem = cartCheck[0] as { id: string; quantity: number };
      await c.env.DB.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?')
        .bind(existingItem.quantity + 1, existingItem.id).run();
    } else {
      const cartId = crypto.randomUUID();
      const now = new Date().toISOString();
      await c.env.DB.prepare(
        'INSERT INTO cart_items (id, user_id, product_id, quantity, created_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(cartId, user.id, productId, 1, now).run();
    }

    // Remove from wishlist
    await c.env.DB.prepare(
      'DELETE FROM wishlist WHERE user_id = ? AND product_id = ?'
    ).bind(user.id, productId).run();

    return c.json({ message: 'Đã chuyển vào giỏ hàng' });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ── CRON TASKS ───────────────────────────────────────────────────────────────

async function updateOrderStatuses(env: Bindings) {
  const now = new Date();
  const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);

  // Update pending -> preparing (after 30 seconds)
  const { results: toPreparing } = await env.DB.prepare(
    `UPDATE orders SET status = 'preparing', updated_at = ? 
     WHERE status = 'pending' AND created_at <= ?
     RETURNING id`
  ).bind(now.toISOString(), thirtySecondsAgo.toISOString()).all();

  // Update preparing -> shipped (after 30 seconds)
  const { results: toShipped } = await env.DB.prepare(
    `UPDATE orders SET status = 'shipped', updated_at = ? 
     WHERE status = 'preparing' AND updated_at <= ?
     RETURNING id`
  ).bind(now.toISOString(), thirtySecondsAgo.toISOString()).all();

  // Update shipped -> delivered (after 30 seconds)
  const { results: toDelivered } = await env.DB.prepare(
    `UPDATE orders SET status = 'delivered', updated_at = ? 
     WHERE status = 'shipped' AND updated_at <= ?
     RETURNING id`
  ).bind(now.toISOString(), thirtySecondsAgo.toISOString()).all();

  return {
    preparing: toPreparing?.length || 0,
    shipped: toShipped?.length || 0,
    delivered: toDelivered?.length || 0,
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
