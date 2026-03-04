# RAG Implementation Patch

## Step 1: Add Helper Functions
After line 80 in ai-worker/src/index.ts (after the closing brace of normalizeProductNames), add:

```typescript
// --- RAG: Embedding Functions ---
async function generateEmbedding(text: string, env: any): Promise<number[]> {
  try {
    const response = await env.AI.run('@cf/baai/bge-m3', { text: [text] });
    return response.data[0];
  } catch (e) { console.error('Embedding error:', e); return []; }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) { dotProduct += a[i] * b[i]; normA += a[i] * a[i]; normB += b[i] * b[i]; }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function productToText(product: any): string {
  const specs = product.specs ? Object.entries(product.specs).map(([k, v]) => `${k}: ${v}`).join(', ') : '';
  return `${product.name} ${product.brand} ${product.category} ${product.description} ${specs}`.toLowerCase();
}
```

## Step 2: Replace Product Search (lines ~297-334)

Replace this block:
```typescript
      // --- PRODUCT SEARCH / FILTER - LIST MULTIPLE PRODUCTS ---
```

With:
```typescript
      // --- PRODUCT SEARCH / FILTER - RAG ENHANCED ---
      if ((llmJson.intent === 'product_search' || llmJson.intent === 'product_filter_price') && llmJson.action?.query) {
        try {
          const backendUrl = c.env.BACKEND_URL || 'http://127.0.0.1:8080';
          let searchQuery = llmJson.action.query;
          
          // Extract price filter
          let minPrice = 0, maxPrice = 100000000;
          if (searchQuery.includes('dưới') || searchQuery.includes('dươi')) {
            const match = searchQuery.match(/(\d+)\s*triệu/i);
            if (match) maxPrice = parseInt(match[1]) * 1000000;
          }
          if (searchQuery.includes('trên')) {
            const match = searchQuery.match(/(\d+)\s*triệu/i);
            if (match) minPrice = parseInt(match[1]) * 1000000;
          }
          
          const searchUrl = `${backendUrl}/api/products?search=${encodeURIComponent(searchQuery)}&minPrice=${minPrice}&maxPrice=${maxPrice}`;
          const searchRes = await fetch(searchUrl);
          
          if (searchRes.ok) {
            let products: any = await searchRes.json();
            if (products && products.length > 0) {
              // RAG: Generate query embedding and re-rank
              const queryText = `user wants: ${searchQuery}. product:`;
              const queryEmbedding = await generateEmbedding(queryText, c.env);
              
              if (queryEmbedding.length > 0) {
                const productsWithScores = await Promise.all(
                  products.slice(0, 20).map(async (product: any) => {
                    const productText = productToText(product);
                    const productEmbedding = await generateEmbedding(productText, c.env);
                    const score = cosineSimilarity(queryEmbedding, productEmbedding);
                    return { product, score };
                  })
                );
                productsWithScores.sort((a, b) => b.score - a.score);
                products = productsWithScores.slice(0, 5).map((p: any) => p.product);
              }
              
              const results = products.slice(0, 5);
              llmJson.action.payload = { results };
              const itemsList = results.map((p: any, i: number) => `${i + 1}. ${p.name}: ${p.price.toLocaleString('vi-VN')} VND`).join('\n');
              llmJson.response_text = `Tôi tìm thấy ${results.length} sản phẩm phù hợp:\n${itemsList}\nBạn muốn chọn sản phẩm nào?`;
            } else {
              llmJson.response_text = "Dạ, em rất tiếc là hiện tại cửa hàng không có sản phẩm nào phù hợp ạ.";
            }
          }
        } catch (e) { console.error("Product search error", e); }
      }
```

## Step 3: Deploy
```bash
cd ai-worker && wrangler deploy
```
