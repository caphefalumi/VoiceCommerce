import { describe, test, expect } from "bun:test";

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

describe("parseSpecs", () => {
  test("returns empty object for invalid JSON", () => {
    expect(parseSpecs("invalid json")).toEqual({});
    expect(parseSpecs("")).toEqual({});
  });

  test("parses array format with label/value", () => {
    const input = JSON.stringify([
      { label: "Screen", value: "6.1 inch" },
      { label: "Chip", value: "A15 Bionic" },
      { label: "Storage", value: "128GB" },
    ]);
    const result = parseSpecs(input);
    expect(result).toEqual({
      "Screen": "6.1 inch",
      "Chip": "A15 Bionic",
      "Storage": "128GB",
    });
  });

  test("parses object format directly", () => {
    const input = JSON.stringify({ color: "Red", weight: "170g" });
    expect(parseSpecs(input)).toEqual({ color: "Red", weight: "170g" });
  });

  test("ignores items without label or value", () => {
    const input = JSON.stringify([
      { label: "Screen", value: "6.1 inch" },
      { label: "Chip" },
      { value: "128GB" },
    ]);
    const result = parseSpecs(input);
    expect(result).toEqual({ "Screen": "6.1 inch" });
  });

  test("handles empty array", () => {
    expect(parseSpecs("[]")).toEqual({});
  });
});

describe("decodeUnicodeStr", () => {
  test("returns original string if no unicode escapes", () => {
    expect(decodeUnicodeStr("Hello World")).toBe("Hello World");
    expect(decodeUnicodeStr("")).toBe("");
  });

  test("returns original for null/undefined", () => {
    expect(decodeUnicodeStr(null as any)).toBe(null);
    expect(decodeUnicodeStr(undefined as any)).toBe(undefined);
  });

  test("decodes unicode escape sequences", () => {
    expect(decodeUnicodeStr("Hello \\u0041World")).toBe("Hello AWorld");
    expect(decodeUnicodeStr("\\u00C0\\u00C8")).toBe("ÀÈ");
    expect(decodeUnicodeStr("Product: iPhone \\u002813\\u0029")).toBe("Product: iPhone (13)");
  });

  test("handles mixed content", () => {
    expect(decodeUnicodeStr("Ti\\u1EC7ng Vi\\u1EC7t")).toBe("Tiệng Việt");
  });
});

describe("parseReviews", () => {
  test("returns empty array for invalid JSON", () => {
    expect(parseReviews("invalid json")).toEqual([]);
    expect(parseReviews("")).toEqual([]);
  });

  test("parses array of reviews with all fields", () => {
    const input = JSON.stringify([
      { userName: "John", rating: 5, comment: "Great product!", date: "2024-01-01" },
      { userName: "Jane", rating: 4, comment: "Good value", date: "2024-01-02" },
    ]);
    const result = parseReviews(input);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: "review-0",
      userName: "John",
      rating: 5,
      comment: "Great product!",
      date: "2024-01-01",
    });
    expect(result[1]).toEqual({
      id: "review-1",
      userName: "Jane",
      rating: 4,
      comment: "Good value",
      date: "2024-01-02",
    });
  });

  test("handles alternative field names", () => {
    const input = JSON.stringify([
      { userName: "User1", star: 5, content: "Amazing!", createdAt: "2024-01-01" },
      { userName: "User2", rating: 3, review: "Average", date: "2024-01-02" },
    ]);
    const result = parseReviews(input);
    expect(result[0].rating).toBe(5);
    expect(result[0].comment).toBe("Amazing!");
    expect(result[1].rating).toBe(3);
    expect(result[1].comment).toBe("Average");
  });

  test("handles unicode escape sequences in comments", () => {
    const input = JSON.stringify([
      { userName: "User1", rating: 5, comment: "S\\u1EA3n ph\\u1EA9m t\\u1ED1t" },
    ]);
    const result = parseReviews(input);
    expect(result[0].comment).toBe("Sản phẩm tốt");
  });

  test("provides defaults for missing fields", () => {
    const input = JSON.stringify([{}]);
    const result = parseReviews(input);
    expect(result[0].userName).toBe("User 1");
    expect(result[0].rating).toBe(0);
    expect(result[0].comment).toBe("");
    expect(result[0].date).toBeDefined();
  });

  test("handles empty array", () => {
    expect(parseReviews("[]")).toEqual([]);
  });

  test("handles non-array JSON object", () => {
    expect(parseReviews('{"key": "value"}')).toEqual([]);
  });
});

describe("discount calculations", () => {
  test("calculates discount percentage correctly", () => {
    const originalPrice = 100;
    const price = 80;
    const discountPercentage = originalPrice > price 
      ? Math.round(((originalPrice - price) / originalPrice) * 100) 
      : 0;
    expect(discountPercentage).toBe(20);
  });

  test("handles no discount", () => {
    const originalPrice = 100;
    const price = 100;
    const discountPercentage = originalPrice > price 
      ? Math.round(((originalPrice - price) / originalPrice) * 100) 
      : 0;
    expect(discountPercentage).toBe(0);
  });

  test("isFlashSale returns true for >=10% discount", () => {
    const originalPrice = 100;
    const price = 85;
    const discountPercentage = originalPrice > price 
      ? Math.round(((originalPrice - price) / originalPrice) * 100) 
      : 0;
    const isFlashSale = discountPercentage >= 10;
    expect(isFlashSale).toBe(true);
  });

  test("isFlashSale returns false for <10% discount", () => {
    const originalPrice = 100;
    const price = 95;
    const discountPercentage = originalPrice > price 
      ? Math.round(((originalPrice - price) / originalPrice) * 100) 
      : 0;
    const isFlashSale = discountPercentage >= 10;
    expect(isFlashSale).toBe(false);
  });
});
