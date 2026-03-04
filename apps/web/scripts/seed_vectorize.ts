/**
 * Seed Cloudflare Vectorize with product embeddings from MongoDB export.
 *
 * Prerequisites:
 *   1. Run `npx tsx scripts/export_products_for_vectorize.ts` first.
 *   2. Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID env vars.
 *
 * Run: npx tsx scripts/seed_vectorize.ts
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const INDEX_NAME = 'tgdd-products';
const MODEL = '@cf/baai/bge-m3';
const EMBED_BATCH = 10;   // Workers AI limit per call
const UPSERT_BATCH = 100; // Vectorize ndjson batch size

if (!CF_API_TOKEN || !CF_ACCOUNT_ID) {
  console.error('❌  Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID');
  process.exit(1);
}

type ProductRecord = {
  id: string;
  text: string;
  metadata: { name: string; brand: string; price: number; category: string };
};

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${MODEL}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: texts }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Embedding API error ${res.status}: ${err}`);
  }
  const json: any = await res.json();
  return json.result.data as number[][];
}

async function upsertBatch(vectors: { id: string; values: number[]; metadata: object }[]) {
  // Vectorize upsert expects newline-delimited JSON (ndjson)
  const ndjson = vectors.map((v) => JSON.stringify(v)).join('\n');

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/vectorize/v2/indexes/${INDEX_NAME}/upsert`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/x-ndjson',
      },
      body: ndjson,
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Vectorize upsert error ${res.status}: ${err}`);
  }
  return res.json();
}

async function main() {
  const inputPath = join('scripts', 'products_for_vectorize.json');
  const products: ProductRecord[] = JSON.parse(readFileSync(inputPath, 'utf-8'));
  console.log(`📦  Loaded ${products.length} products`);

  const allVectors: { id: string; values: number[]; metadata: object }[] = [];
  let embedded = 0;

  // --- Step 1: Generate embeddings in batches ---
  for (let i = 0; i < products.length; i += EMBED_BATCH) {
    const batch = products.slice(i, i + EMBED_BATCH);
    const texts = batch.map((p) => p.text);

    try {
      const embeddings = await generateEmbeddings(texts);
      for (let j = 0; j < batch.length; j++) {
        allVectors.push({
          id: batch[j].id,
          values: embeddings[j],
          metadata: batch[j].metadata,
        });
      }
      embedded += batch.length;
      process.stdout.write(`\r🔢  Embedded ${embedded}/${products.length}`);
    } catch (e) {
      console.error(`\n⚠️  Embedding failed for batch starting at ${i}:`, e);
    }
    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\n✅  Generated ${allVectors.length} embeddings`);

  // Save vectors locally as backup
  const vectorsPath = join('scripts', 'vectors.json');
  writeFileSync(vectorsPath, JSON.stringify(allVectors, null, 2));
  console.log(`💾  Saved vectors backup to ${vectorsPath}`);

  // --- Step 2: Upsert into Vectorize in batches ---
  let upserted = 0;
  for (let i = 0; i < allVectors.length; i += UPSERT_BATCH) {
    const batch = allVectors.slice(i, i + UPSERT_BATCH);
    try {
      await upsertBatch(batch);
      upserted += batch.length;
      process.stdout.write(`\r📡  Upserted ${upserted}/${allVectors.length}`);
    } catch (e) {
      console.error(`\n⚠️  Upsert failed for batch starting at ${i}:`, e);
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n🎉  Done! ${upserted} vectors upserted into Vectorize index "${INDEX_NAME}"`);
}

main().catch((e) => { console.error(e); process.exit(1); });
