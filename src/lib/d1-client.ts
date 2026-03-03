import type { D1Database, D1PreparedStatement, D1Result } from './d1-types';
import type { ProductRow, UserRow, CartItemRow } from './d1-types';

export class D1Client {
  private db: D1Database | null;

  constructor(db: D1Database | null) {
    this.db = db;
  }

  private q(sql: string): D1PreparedStatement | null {
    if (!this.db) return null;
    return this.db.prepare(sql);
  }

  async getProducts(limit = 50, offset = 0): Promise<ProductRow[]> {
    const stmt = this.q('SELECT * FROM products ORDER BY created_at DESC LIMIT ? OFFSET ?');
    if (!stmt) return [];
    const result = await stmt.bind(limit, offset).all<ProductRow>();
    return result.results || [];
  }

  async getProductById(id: string): Promise<ProductRow | null> {
    const stmt = this.q('SELECT * FROM products WHERE id = ?');
    if (!stmt) return null;
    return await stmt.bind(id).first<ProductRow>();
  }

  async getProductByUrl(url: string): Promise<ProductRow | null> {
    const stmt = this.q('SELECT * FROM products WHERE url = ?');
    if (!stmt) return null;
    return await stmt.bind(url).first<ProductRow>();
  }

  async searchProducts(query: string, limit = 20): Promise<ProductRow[]> {
    const stmt = this.q('SELECT * FROM products WHERE name LIKE ? OR description LIKE ? LIMIT ?');
    if (!stmt) return [];
    const searchTerm = `%${query}%`;
    const result = await stmt.bind(searchTerm, searchTerm, limit).all<ProductRow>();
    return result.results || [];
  }

  async getProductsByCategory(category: string, limit = 50): Promise<ProductRow[]> {
    const stmt = this.q('SELECT * FROM products WHERE category = ? ORDER BY created_at DESC LIMIT ?');
    if (!stmt) return [];
    const result = await stmt.bind(category, limit).all<ProductRow>();
    return result.results || [];
  }

  async getProductsByBrand(brand: string, limit = 50): Promise<ProductRow[]> {
    const stmt = this.q('SELECT * FROM products WHERE brand = ? ORDER BY created_at DESC LIMIT ?');
    if (!stmt) return [];
    const result = await stmt.bind(brand, limit).all<ProductRow>();
    return result.results || [];
  }

  async createProduct(product: Partial<ProductRow>): Promise<D1Result<ProductRow>> {
    const stmt = this.q(`INSERT INTO products (id, url, name, price, original_price, category, brand, rating, review_count, stock, description, images, specs, reviews, embedding)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    if (!stmt) return { success: false, error: 'Database not available' };
    return await stmt.bind(
      product.id,
      product.url,
      product.name,
      product.price,
      product.original_price,
      product.category,
      product.brand,
      product.rating || 0,
      product.review_count || 0,
      product.stock || 0,
      product.description,
      product.images || '[]',
      product.specs || '[]',
      product.reviews || '[]',
      product.embedding
    ).run();
  }

  async updateProduct(id: string, updates: Partial<ProductRow>): Promise<D1Result<ProductRow>> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.price !== undefined) { fields.push('price = ?'); values.push(updates.price); }
    if (updates.original_price !== undefined) { fields.push('original_price = ?'); values.push(updates.original_price); }
    if (updates.category !== undefined) { fields.push('category = ?'); values.push(updates.category); }
    if (updates.brand !== undefined) { fields.push('brand = ?'); values.push(updates.brand); }
    if (updates.stock !== undefined) { fields.push('stock = ?'); values.push(updates.stock); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.images !== undefined) { fields.push('images = ?'); values.push(updates.images); }
    if (updates.specs !== undefined) { fields.push('specs = ?'); values.push(updates.specs); }
    if (updates.reviews !== undefined) { fields.push('reviews = ?'); values.push(updates.reviews); }

    fields.push('updated_at = datetime("now")');
    values.push(id);

    const stmt = this.q(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`);
    if (!stmt) return { success: false, error: 'Database not available' };
    return await stmt.bind(...values).run();
  }

  async deleteProduct(id: string): Promise<D1Result<ProductRow>> {
    const stmt = this.q('DELETE FROM products WHERE id = ?');
    if (!stmt) return { success: false, error: 'Database not available' };
    return await stmt.bind(id).run();
  }

  async getUserById(id: string): Promise<UserRow | null> {
    const stmt = this.q('SELECT * FROM users WHERE id = ?');
    if (!stmt) return null;
    return await stmt.bind(id).first<UserRow>();
  }

  async getUserByEmail(email: string): Promise<UserRow | null> {
    const stmt = this.q('SELECT * FROM users WHERE email = ?');
    if (!stmt) return null;
    return await stmt.bind(email).first<UserRow>();
  }

  async getUserByUsername(username: string): Promise<UserRow | null> {
    const stmt = this.q('SELECT * FROM users WHERE username = ?');
    if (!stmt) return null;
    return await stmt.bind(username).first<UserRow>();
  }

  async createUser(user: Partial<UserRow>): Promise<D1Result<UserRow>> {
    const stmt = this.q(`INSERT INTO users (id, username, email, password, email_verified, auth_data)
      VALUES (?, ?, ?, ?, ?, ?)`);
    if (!stmt) return { success: false, error: 'Database not available' };
    return await stmt.bind(
      user.id,
      user.username,
      user.email,
      user.password,
      user.email_verified || 0,
      user.auth_data
    ).run();
  }

  async updateUser(id: string, updates: Partial<UserRow>): Promise<D1Result<UserRow>> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.username !== undefined) { fields.push('username = ?'); values.push(updates.username); }
    if (updates.email !== undefined) { fields.push('email = ?'); values.push(updates.email); }
    if (updates.password !== undefined) { fields.push('password = ?'); values.push(updates.password); }
    if (updates.email_verified !== undefined) { fields.push('email_verified = ?'); values.push(updates.email_verified); }
    if (updates.auth_data !== undefined) { fields.push('auth_data = ?'); values.push(updates.auth_data); }

    fields.push('updated_at = datetime("now")');
    values.push(id);

    const stmt = this.q(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`);
    if (!stmt) return { success: false, error: 'Database not available' };
    return await stmt.bind(...values).run();
  }

  async deleteUser(id: string): Promise<D1Result<UserRow>> {
    const stmt = this.q('DELETE FROM users WHERE id = ?');
    if (!stmt) return { success: false, error: 'Database not available' };
    return await stmt.bind(id).run();
  }

  async getCartItems(userId: string): Promise<CartItemRow[]> {
    const stmt = this.q('SELECT * FROM cart_items WHERE user_id = ?');
    if (!stmt) return [];
    const result = await stmt.bind(userId).all<CartItemRow>();
    return result.results || [];
  }

  async addToCart(userId: string, productId: string, quantity = 1): Promise<D1Result<CartItemRow>> {
    const id = `${userId}_${productId}`;
    const stmt = this.q(`INSERT INTO cart_items (id, user_id, product_id, quantity)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET quantity = quantity + ?`);
    if (!stmt) return { success: false, error: 'Database not available' };
    return await stmt.bind(id, userId, productId, quantity, quantity).run();
  }

  async updateCartQuantity(userId: string, productId: string, quantity: number): Promise<D1Result<CartItemRow>> {
    const stmt = this.q('UPDATE cart_items SET quantity = ?, updated_at = datetime("now") WHERE user_id = ? AND product_id = ?');
    if (!stmt) return { success: false, error: 'Database not available' };
    return await stmt.bind(quantity, userId, productId).run();
  }

  async removeFromCart(userId: string, productId: string): Promise<D1Result<CartItemRow>> {
    const stmt = this.q('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?');
    if (!stmt) return { success: false, error: 'Database not available' };
    return await stmt.bind(userId, productId).run();
  }

  async clearCart(userId: string): Promise<D1Result<CartItemRow>> {
    const stmt = this.q('DELETE FROM cart_items WHERE user_id = ?');
    if (!stmt) return { success: false, error: 'Database not available' };
    return await stmt.bind(userId).run();
  }

  async getCellPhoneModels(limit = 50, offset = 0): Promise<any[]> {
    const stmt = this.q('SELECT * FROM cell_phone_models ORDER BY created_at DESC LIMIT ? OFFSET ?');
    if (!stmt) return [];
    const result = await stmt.bind(limit, offset).all();
    return result.results || [];
  }

  async searchCellPhoneModels(query: string, limit = 20): Promise<any[]> {
    const stmt = this.q('SELECT * FROM cell_phone_models WHERE brand LIKE ? OR model LIKE ? LIMIT ?');
    if (!stmt) return [];
    const searchTerm = `%${query}%`;
    const result = await stmt.bind(searchTerm, searchTerm, limit).all();
    return result.results || [];
  }

  async getCellPhoneModelsByBrand(brand: string): Promise<any[]> {
    const stmt = this.q('SELECT * FROM cell_phone_models WHERE brand = ? ORDER BY price DESC');
    if (!stmt) return [];
    const result = await stmt.bind(brand).all();
    return result.results || [];
  }
}

let d1Client: D1Client | null = null;

export function initD1(db: D1Database): D1Client {
  d1Client = new D1Client(db);
  return d1Client;
}

export function getD1Client(): D1Client {
  if (!d1Client) {
    throw new Error('D1 client not initialized. Call initD1() first.');
  }
  return d1Client;
}

export function createD1Client(db: D1Database | null): D1Client {
  return new D1Client(db);
}
