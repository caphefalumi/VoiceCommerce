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
        action = { type: 'checkout_start' };
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
      } else if (toolName === 'addToCart' && parsed?.success) {
        action = { type: 'add_to_cart', payload: parsed };
      } else if (toolName === 'removeFromCart' && parsed?.success) {
        action = { type: 'remove_from_cart', payload: parsed };
      } else if (toolName === 'viewCart' && parsed?.success) {
        action = { type: 'view_cart', payload: parsed };
      } else if (toolName === 'cancelOrder' && parsed?.success) {
        action = { type: 'cancel_order', payload: parsed };
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
