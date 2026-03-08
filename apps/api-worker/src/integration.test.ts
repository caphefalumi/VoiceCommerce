import { describe, test, expect } from "bun:test";
import { Hono } from "hono";
import { cors } from "hono/cors";

const createMockApp = () => {
  const app = new Hono();
  
  app.use("*", cors({
    origin: ["http://localhost:5173"],
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  }));

  const mockDB = {
    prepare: (query: string) => ({
      bind: (...params: any[]) => ({
        all: async () => ({ results: [] }),
        run: async () => ({ success: true }),
        first: async () => null,
      }),
    }),
  };

  const mockEnv = {
    DB: mockDB as any,
    BETTER_AUTH_SECRET: "test-secret",
    BETTER_AUTH_URL: "http://localhost:8787",
    MAILERSEND_API_KEY: "",
    GOOGLE_CLIENT_ID: "",
    GOOGLE_CLIENT_SECRET: "",
  };

  return { app, mockEnv, mockDB };
};

describe("Health Endpoint", () => {
  const { app, mockEnv } = createMockApp();

  app.get("/health", (c) => c.json({ status: "ok" }));

  test("GET /health returns ok status", async () => {
    const res = await app.request("/health", { method: "GET" }, mockEnv as any);
    expect(res.status).toBe(200);
    const data = await res.json() as { status: string };
    expect(data.status).toBe("ok");
  });
});

describe("Products API", () => {
  const { app, mockEnv } = createMockApp();
  
  app.get("/api/products", async (c) => {
    const { category, search, minPrice, maxPrice } = c.req.query();
    let query = "SELECT * FROM products WHERE 1=1";
    const params: any[] = [];
    
    if (category) {
      query += " AND category = ?";
      params.push(category);
    }
    if (search) {
      query += " AND (name LIKE ? OR description LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }
    if (minPrice) {
      query += " AND price >= ?";
      params.push(parseFloat(minPrice));
    }
    if (maxPrice) {
      query += " AND price <= ?";
      params.push(parseFloat(maxPrice));
    }
    query += " LIMIT 200";
    
    const { results } = await (c.env as any).DB.prepare(query).bind(...params).all();
    return c.json({ products: results });
  });

  test("GET /api/products returns empty array when no products", async () => {
    const res = await app.request("/api/products", { method: "GET" }, mockEnv as any);
    expect(res.status).toBe(200);
    const data = await res.json() as { products: any[] };
    expect(data.products).toEqual([]);
  });

  test("GET /api/products filters by category", async () => {
    let lastQuery = "";
    const customDB = {
      prepare: (query: string) => {
        lastQuery = query;
        return {
          bind: (...params: any[]) => ({
            all: async () => ({ results: [] }),
          }),
        };
      },
    };
    const customEnv = { ...mockEnv, DB: customDB };
    
    await app.request("/api/products?category=Phone", { method: "GET" }, customEnv as any);
    expect(lastQuery).toContain("category = ?");
  });

  test("GET /api/products filters by search term", async () => {
    let lastQuery = "";
    const customDB = {
      prepare: (query: string) => {
        lastQuery = query;
        return {
          bind: (...params: any[]) => ({
            all: async () => ({ results: [] }),
          }),
        };
      },
    };
    const customEnv = { ...mockEnv, DB: customDB };
    
    await app.request("/api/products?search=iphone", { method: "GET" }, customEnv as any);
    expect(lastQuery).toContain("name LIKE ?");
  });

  test("GET /api/products filters by price range", async () => {
    let lastParams: any[] = [];
    const customDB = {
      prepare: (query: string) => {
        return {
          bind: (...params: any[]) => {
            lastParams = params;
            return {
              all: async () => ({ results: [] }),
            };
          },
        };
      },
    };
    const customEnv = { ...mockEnv, DB: customDB };
    
    await app.request("/api/products?minPrice=100&maxPrice=500", { method: "GET" }, customEnv as any);
    expect(lastParams).toContain(100);
    expect(lastParams).toContain(500);
  });
});

describe("Cart API", () => {
  const { app, mockEnv } = createMockApp();

  app.get("/api/cart", async (c) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    return c.json({ cart: [] });
  });

  app.post("/api/cart", async (c) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const { product_id, quantity } = await c.req.json();
    if (!product_id) {
      return c.json({ error: "product_id is required" }, 400);
    }
    return c.json({ id: "cart-item-id", message: "Added to cart" }, 201);
  });

  test("GET /api/cart returns 401 without auth", async () => {
    const res = await app.request("/api/cart", { method: "GET" }, mockEnv as any);
    expect(res.status).toBe(401);
  });

  test("POST /api/cart returns 400 without product_id", async () => {
    const res = await app.request("/api/cart", {
      method: "POST",
      headers: { Authorization: "Bearer token" },
      body: JSON.stringify({ quantity: 1 }),
    }, mockEnv as any);
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toBe("product_id is required");
  });
});

describe("Orders API", () => {
  const { app, mockEnv } = createMockApp();

  app.post("/api/orders", async (c) => {
    const { user_id, items, total_price } = await c.req.json();
    if (!user_id || !items || !total_price) {
      return c.json({ error: "user_id, items, va total_price la cac truong bat buoc" }, 400);
    }
    const id = "order-" + Math.random().toString(36).substr(2, 9);
    return c.json({ id, status: "preparing", message: "Dat hang thanh cong" }, 201);
  });

  test("POST /api/orders returns 400 when missing required fields", async () => {
    const res = await app.request("/api/orders", {
      method: "POST",
      body: JSON.stringify({ user_id: "user-1" }),
    }, mockEnv as any);
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toContain("user_id");
  });

  test("POST /api/orders creates order with valid data", async () => {
    const res = await app.request("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        user_id: "user-1",
        user_email: "test@example.com",
        items: [{ name: "iPhone", price: 1000, quantity: 1 }],
        total_price: 1000,
      }),
    }, mockEnv as any);
    expect(res.status).toBe(201);
    const data = await res.json() as { id: string; status: string };
    expect(data.id).toBeDefined();
    expect(data.status).toBe("preparing");
  });
});

describe("Tickets API", () => {
  const { app, mockEnv } = createMockApp();

  app.post("/api/tickets", async (c) => {
    const { category, message } = await c.req.json();
    if (!category || !message) {
      return c.json({ error: "Danh muc va noi dung tin nhan la bat buoc" }, 400);
    }
    const validCategories = ["product_issue", "delivery", "payment", "return_exchange", "warranty", "other"];
    if (!validCategories.includes(category)) {
      return c.json({ error: "Invalid category" }, 400);
    }
    const id = "ticket-" + Math.random().toString(36).substr(2, 9);
    return c.json({ id, status: "open", message: "Da gui phieu ho tro thanh cong" }, 201);
  });

  test("POST /api/tickets returns 400 when missing fields", async () => {
    const res = await app.request("/api/tickets", {
      method: "POST",
      body: JSON.stringify({ category: "delivery" }),
    }, mockEnv as any);
    expect(res.status).toBe(400);
  });

  test("POST /api/tickets returns 400 for invalid category", async () => {
    const res = await app.request("/api/tickets", {
      method: "POST",
      body: JSON.stringify({ category: "invalid", message: "Help" }),
    }, mockEnv as any);
    expect(res.status).toBe(400);
  });

  test("POST /api/tickets creates ticket with valid data", async () => {
    const res = await app.request("/api/tickets", {
      method: "POST",
      body: JSON.stringify({ category: "delivery", message: "Where is my order?" }),
    }, mockEnv as any);
    expect(res.status).toBe(201);
    const data = await res.json() as { id: string };
    expect(data.id).toBeDefined();
  });
});

describe("CORS Headers", () => {
  const { app, mockEnv } = createMockApp();
  
  app.get("/test-cors", (c) => c.json({ ok: true }));

  test("includes CORS headers in response", async () => {
    const res = await app.request("/test-cors", {
      method: "GET",
      headers: {
        Origin: "http://localhost:5173",
        "Access-Control-Request-Method": "GET",
      },
    }, mockEnv as any);
    
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
  });
});

describe("Error Handling", () => {
  const { app, mockEnv } = createMockApp();

  app.get("/error-json", () => {
    return new Response(JSON.stringify({ error: "Test error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  });

  test("handles errors gracefully", async () => {
    const res = await app.request("/error-json", { method: "GET" }, mockEnv as any);
    expect(res.status).toBe(500);
  });
});
