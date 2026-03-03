export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  batch(statements: D1PreparedStatement[]): Promise<D1Result<any>[]>;
  exec(sql: string): Promise<void>;
}

export interface D1PreparedStatement {
  bind(...params: any[]): D1PreparedStatement;
  first<T = any>(args?: any): Promise<T | null>;
  run<T = any>(args?: any): Promise<D1Result<T>>;
  all<T = any>(args?: any): Promise<D1Result<T>>;
}

export interface D1Result<T> {
  results?: T[];
  success: boolean;
  error?: string;
  meta?: {
    rows_written?: number;
    rows_read?: number;
    changed_db?: boolean;
    last_row_id?: number;
  };
}

export interface ProductRow {
  id: string;
  url: string;
  name: string;
  price: number;
  original_price: number | null;
  category: string | null;
  brand: string | null;
  rating: number;
  review_count: number;
  stock: number;
  description: string | null;
  images: string;
  specs: string;
  reviews: string;
  embedding: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRow {
  id: string;
  username: string | null;
  email: string;
  password: string | null;
  email_verified: number;
  auth_data: string | null;
  created_at: string;
  updated_at: string;
}

export interface CartItemRow {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export function parseJson<T>(str: string | null, defaultValue: T): T {
  if (!str) return defaultValue;
  try {
    return JSON.parse(str) as T;
  } catch {
    return defaultValue;
  }
}

export function toJson<T>(value: T): string {
  return JSON.stringify(value);
}
