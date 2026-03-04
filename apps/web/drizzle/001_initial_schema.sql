-- Migration: 001_initial_schema
-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    original_price REAL,
    category TEXT,
    brand TEXT,
    rating REAL DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    stock INTEGER DEFAULT 0,
    description TEXT,
    images TEXT, -- JSON array stored as TEXT
    specs TEXT, -- JSON array stored as TEXT
    reviews TEXT, -- JSON array stored as TEXT
    embedding TEXT, -- JSON array stored as TEXT
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    email TEXT UNIQUE NOT NULL,
    password TEXT,
    email_verified INTEGER DEFAULT 0,
    auth_data TEXT, -- JSON object stored as TEXT
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    permissions TEXT, -- JSON array stored as TEXT
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Create user_roles junction table
CREATE TABLE IF NOT EXISTS user_roles (
    user_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- Create cart_items table
CREATE TABLE IF NOT EXISTS cart_items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items(user_id);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    image_url TEXT,
    parent_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Create cell_phone_models table (for Dataset_Cell_Phones_Model_Brand)
CREATE TABLE IF NOT EXISTS cell_phone_models (
    id TEXT PRIMARY KEY,
    model TEXT,
    brand TEXT,
    network TEXT,
    announced TEXT,
    status TEXT,
    dimensions TEXT,
    weight TEXT,
    sim TEXT,
    display_type TEXT,
    display_size TEXT,
    display_resolution TEXT,
    os TEXT,
    cpu TEXT,
    chipset TEXT,
    gpu TEXT,
    memory_card TEXT,
    internal_memory TEXT,
    ram TEXT,
    primary_camera TEXT,
    secondary_camera TEXT,
    bluetooth TEXT,
    gps TEXT,
    nfc TEXT,
    radio TEXT,
    usb TEXT,
    sensors TEXT,
    battery TEXT,
    colors TEXT,
    price REAL,
    images TEXT, -- JSON array
    embedding TEXT, -- JSON array for vectorize
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_phone_brand ON cell_phone_models(brand);
CREATE INDEX IF NOT EXISTS idx_phone_model ON cell_phone_models(model);
