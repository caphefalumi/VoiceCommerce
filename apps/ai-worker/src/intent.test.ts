import { expect, test, describe } from "bun:test";
import { processIntent } from "./intent";

describe("processIntent", () => {
  test("returns null action and empty searchResults for empty input", () => {
    const result = processIntent([], "hello");
    expect(result.action).toBeNull();
    expect(result.searchResults).toEqual([]);
    
    expect(processIntent(null as any, "hello")).toEqual({ action: null, searchResults: [] });
    expect(processIntent(undefined as any, "hello")).toEqual({ action: null, searchResults: [] });
  });

  test("handles startCheckout", () => {
    const toolResults = [{ toolName: "startCheckout", result: "{}" }];
    const result = processIntent(toolResults, "checkout");
    expect(result.action).toEqual({ type: "checkout_start" });
  });

  test("handles searchProducts with content array", () => {
    const toolResults = [{
      toolName: "searchProducts",
      output: { content: [{ text: JSON.stringify({ results: [{ id: "1", name: "iPhone", price: 1000 }] }) }] }
    }];
    const result = processIntent(toolResults, "find iphone");
    expect(result.action).toEqual({ type: "search", query: "find iphone" });
    expect(result.searchResults).toEqual([{
      id: "1", name: "iPhone", price: 1000, brand: "", category: "", index: 1
    }]);
  });

  test("handles searchProducts with direct result string", () => {
    const toolResults = [{
      toolName: "searchProducts",
      result: JSON.stringify({ results: [{ id: "2", name: "Samsung", price: 800, brand: "Samsung", category: "Phone" }] })
    }];
    const result = processIntent(toolResults, "find samsung");
    expect(result.searchResults).toEqual([{
      id: "2", name: "Samsung", price: 800, brand: "Samsung", category: "Phone", index: 1
    }]);
  });

  test("handles filterProductsByPrice with results", () => {
    const toolResults = [{
      toolName: "filterProductsByPrice",
      result: JSON.stringify({ results: [{ id: "3", name: "Cheap Phone", price: 100 }] })
    }];
    const result = processIntent(toolResults, "under 200");
    expect(result.action).toEqual({ type: "filter", query: "under 200" });
    expect(result.searchResults[0].name).toBe("Cheap Phone");
  });

  test("handles addToCart success", () => {
    const toolResults = [{
      toolName: "addToCart",
      result: JSON.stringify({ success: true, product: { name: "iPhone" } })
    }];
    const result = processIntent(toolResults, "add iphone");
    expect(result.action?.type).toBe("add_to_cart");
    expect(result.action?.payload.success).toBe(true);
  });

  test("handles removeFromCart success", () => {
    const toolResults = [{
      toolName: "removeFromCart",
      result: JSON.stringify({ success: true })
    }];
    const result = processIntent(toolResults, "remove it");
    expect(result.action?.type).toBe("remove_from_cart");
  });

  test("handles viewCart success", () => {
    const toolResults = [{
      toolName: "viewCart",
      result: JSON.stringify({ success: true, items: [] })
    }];
    const result = processIntent(toolResults, "show cart");
    expect(result.action?.type).toBe("view_cart");
  });

  test("handles cancelOrder success", () => {
    const toolResults = [{
      toolName: "cancelOrder",
      result: JSON.stringify({ success: true })
    }];
    const result = processIntent(toolResults, "cancel my order");
    expect(result.action?.type).toBe("cancel_order");
  });

  test("handles compareProducts success", () => {
    const toolResults = [{
      toolName: "compareProducts",
      result: JSON.stringify({ products: [{ name: "A" }, { name: "B" }] })
    }];
    const result = processIntent(toolResults, "compare A and B");
    expect(result.action?.type).toBe("compare");
  });

  test("handles getProductDetails success", () => {
    const toolResults = [{
      toolName: "getProductDetails",
      result: JSON.stringify({ product: { id: "p1", name: "Pro", price: 50, brand: "B", category: "C" } })
    }];
    const result = processIntent(toolResults, "tell me about Pro");
    expect(result.action?.type).toBe("product_details");
    expect(result.searchResults).toEqual([{
      id: "p1", name: "Pro", price: 50, brand: "B", category: "C", index: 1
    }]);
  });

  test("skips malformed results or unknown tools", () => {
    const toolResults = [
      { toolName: "unknown", result: "{}" },
      { toolName: "searchProducts", result: "invalid-json" }
    ];
    const result = processIntent(toolResults, "test");
    expect(result.action).toBeNull();
    expect(result.searchResults).toEqual([]);
  });

  test("handles tool result object (non-string result)", () => {
    const toolResults = [{
      toolName: "viewCart",
      result: { success: true }
    }];
    const result = processIntent(toolResults, "cart");
    expect(result.action?.type).toBe("view_cart");
  });
});
