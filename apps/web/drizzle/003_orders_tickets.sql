-- Migration: 003_orders_tickets
-- Adds orders and support_tickets tables required for voice checkout and customer service flows

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  -- 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  total_price REAL NOT NULL,
  items TEXT NOT NULL,          -- JSON: [{productId, name, price, quantity}]
  shipping_address TEXT,        -- JSON: {name, phone, address} or NULL
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status   ON orders (status);

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT,                 -- NULL allowed for anonymous/voice-only callers
  category TEXT NOT NULL,
  -- 'product_issue' | 'delivery' | 'payment' | 'return_exchange' | 'warranty' | 'other'
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  -- 'open' | 'in_progress' | 'resolved' | 'closed'
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON support_tickets (user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status  ON support_tickets (status);
