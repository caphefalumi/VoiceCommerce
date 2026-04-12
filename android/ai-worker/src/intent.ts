export interface ProcessedAction {
  type: string;
  query?: string;
  payload?: any;
}

export interface SearchResult {
  id: string;
  name: string;
  price: number;
  brand: string;
  category: string;
  index: number;
}

function parseRequestedCount(userMessage: string): number {
  const m = userMessage.match(/\b(\d{1,2})\b/);
  if (!m) return 3;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return 3;
  return Math.max(1, Math.min(5, Math.trunc(n)));
}

function formatPrice(price: number): string {
  if (!Number.isFinite(price) || price <= 0) return 'Contact us';
  return `${price.toLocaleString('en-US')} VND`;
}

export function buildSearchResponseText(searchResults: SearchResult[], userMessage: string): string {
  if (!searchResults.length) {
    return 'No matching products found.';
  }

  const hasSpecificCount = /\b(\d{1,2})\b/.test(userMessage);
  const requestedCount = parseRequestedCount(userMessage);
  const selected = searchResults.slice(0, requestedCount);
  const lines = selected
    .map((p, idx) => `${idx + 1}. ${p.name} | ${formatPrice(p.price)}`)
    .join('\n');

  const header = hasSpecificCount
    ? `Found ${selected.length} matching products.`
    : `Found some matching products.`;
  return `${header}\n${lines}`;
}

/**
 * Processes tool results from the LLM to determine the final action and search results
 * for the frontend.
 */
export function processIntent(toolResults: any[], userMessage: string): { action: ProcessedAction | null, searchResults: SearchResult[] } {
  let action: ProcessedAction | null = null;
  let searchResults: SearchResult[] = [];

  if (!toolResults || !Array.isArray(toolResults)) {
    return { action, searchResults };
  }

  for (const tr of toolResults) {
    try {
      let parsed: any;
      if (tr.output?.content?.[0]?.text) {
        parsed = JSON.parse(tr.output.content[0].text);
      } else {
        parsed = typeof tr.result === 'string' ? JSON.parse(tr.result) : tr.result;
      }

      const toolName = tr.toolName;

      if (toolName === 'startCheckout') {
        if (parsed?.action === 'checkout_review') {
          action = { type: 'checkout_review', payload: parsed };
        } else {
          action = { type: 'checkout_start', payload: parsed };
        }
      } else if (toolName === 'confirmCheckout') {
        if (parsed?.action === 'checkout_complete') {
          action = { type: 'checkout_complete', payload: parsed };
        } else {
          action = { type: 'checkout_start', payload: parsed };
        }
      } else if (toolName === 'searchProducts') {
        action = { type: 'search', query: userMessage };
        if (parsed?.results) {
          searchResults = parsed.results.map((p: any, idx: number) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            brand: p.brand || '',
            category: p.category || '',
            index: idx + 1,
          }));
        }
      } else if (toolName === 'filterProductsByPrice') {
        action = { type: 'filter', query: userMessage };
        if (parsed?.results) {
          searchResults = parsed.results.map((p: any, idx: number) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            brand: p.brand || '',
            category: p.category || '',
            index: idx + 1,
          }));
        }
      } else if (toolName === 'addToCart') {
        if (parsed?.success) {
          action = { type: 'add_to_cart', payload: parsed };
        } else {
          action = { type: 'add_to_cart_failed', payload: parsed };
        }
      } else if (toolName === 'removeFromCart') {
        if (parsed?.success) {
          action = { type: 'remove_from_cart', payload: parsed };
        } else {
          action = { type: 'remove_from_cart_failed', payload: parsed };
        }
      } else if (toolName === 'viewCart') {
        if (parsed?.success) {
          action = { type: 'view_cart', payload: parsed };
        } else {
          action = { type: 'view_cart_failed', payload: parsed };
        }
      } else if (toolName === 'cancelOrder') {
        if (parsed?.success) {
          action = { type: 'cancel_order', payload: parsed };
        } else {
          action = { type: 'cancel_order_failed', payload: parsed };
        }
      } else if (toolName === 'compareProducts' && parsed?.products?.length) {
        action = { type: 'compare', payload: parsed };
      } else if (toolName === 'getProductDetails' && parsed?.product) {
        action = { type: 'product_details', payload: parsed };
        const p = parsed.product;
        searchResults = [
          {
            id: p.id,
            name: p.name,
            price: p.price,
            brand: p.brand || '',
            category: p.category || '',
            index: 1,
          },
        ];
      }
    } catch {
      // Skip malformed results
    }
  }

  return { action, searchResults };
}
