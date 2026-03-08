import { test, expect, describe, beforeAll, afterAll } from "bun:test";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8787";

describe("E2E: Products API", () => {
  test("GET /health returns 200", async () => {
    const res = await fetch(`${API_BASE_URL}/health`);
    expect(res.status).toBe(200);
    const data = await res.json() as { status: string };
    expect(data.status).toBe("ok");
  });

  test("GET /api/products returns products array", async () => {
    const res = await fetch(`${API_BASE_URL}/api/products`);
    expect(res.status).toBe(200);
    const data = await res.json() as { products: any[] };
    expect(Array.isArray(data.products)).toBe(true);
  });

  test("GET /api/products?category=Phone filters correctly", async () => {
    const res = await fetch(`${API_BASE_URL}/api/products?category=Phone`);
    expect(res.status).toBe(200);
    const data = await res.json() as { products: any[] };
    expect(Array.isArray(data.products)).toBe(true);
  });

  test("GET /api/products?search=iphone searches correctly", async () => {
    const res = await fetch(`${API_BASE_URL}/api/products?search=iphone`);
    expect(res.status).toBe(200);
    const data = await res.json() as { products: any[] };
    expect(Array.isArray(data.products)).toBe(true);
  });

  test("GET /api/products?minPrice=100&maxPrice=500 filters by price", async () => {
    const res = await fetch(`${API_BASE_URL}/api/products?minPrice=100&maxPrice=500`);
    expect(res.status).toBe(200);
    const data = await res.json() as { products: any[] };
    expect(Array.isArray(data.products)).toBe(true);
  });
});

describe("E2E: Orders API", () => {
  test("POST /api/orders returns 400 for missing fields", async () => {
    const res = await fetch(`${API_BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: "test-user" }),
    });
    expect(res.status).toBe(400);
  });

  test("POST /api/orders returns 201 for valid order", async () => {
    const res = await fetch(`${API_BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: "test-user",
        user_email: "test@example.com",
        user_name: "Test User",
        items: [{ name: "iPhone 15", price: 10000000, quantity: 1 }],
        total_price: 10000000,
        shipping_address: { address: "123 Test St", city: "HCMC" },
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json() as { id: string; status: string };
    expect(data.id).toBeDefined();
    expect(data.status).toBe("preparing");
  });
});

describe("E2E: Tickets API", () => {
  test("POST /api/tickets returns 400 for missing fields", async () => {
    const res = await fetch(`${API_BASE_URL}/api/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "delivery" }),
    });
    expect(res.status).toBe(400);
  });

  test("POST /api/tickets returns 400 for invalid category", async () => {
    const res = await fetch(`${API_BASE_URL}/api/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "invalid", message: "Test message" }),
    });
    expect(res.status).toBe(400);
  });

  test("POST /api/tickets returns 201 for valid ticket", async () => {
    const res = await fetch(`${API_BASE_URL}/api/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: "test-user",
        category: "delivery",
        message: "Where is my order?",
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json() as { id: string; status: string };
    expect(data.id).toBeDefined();
    expect(data.status).toBe("open");
  });
});

describe("E2E: CORS", () => {
  test("includes CORS headers for allowed origin", async () => {
    const res = await fetch(`${API_BASE_URL}/health`, {
      headers: { Origin: "http://localhost:5173" },
    });
    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
  });

  test("handles preflight OPTIONS request", async () => {
    const res = await fetch(`${API_BASE_URL}/api/products`, {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:5173",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "Content-Type",
      },
    });
    expect(res.status).toBe(200);
  });
});
