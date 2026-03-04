/**
 * Export products from local MongoDB to JSON for Vectorize ingestion.
 * Run: npx tsx scripts/export_products_for_vectorize.ts
 */
import mongoose from 'mongoose';
import { writeFileSync } from 'fs';

const MONGODB_URI = 'mongodb+srv://admin:%40dminpr0@cluster0.in5tnwg.mongodb.net/tgdd';

async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;
  
  const products = await db.collection('products').find({}).toArray();
  console.log(`Found ${products.length} products in MongoDB`);

  // Transform each product into a Vectorize-ready record
  const records = products.map((p) => {
    // Build searchable text for embedding
    const specsText = Array.isArray(p.specs)
      ? p.specs.map((s: any) => `${s.label}: ${s.value || ''}`).join(', ')
      : '';
    
    const text = [
      p.name,
      p.brand,
      p.category,
      p.description,
      specsText,
      p.price ? `Giá: ${p.price.toLocaleString('vi-VN')} VND` : '',
    ].filter(Boolean).join(' | ');

    return {
      id: p._id.toString(),
      text,
      metadata: {
        name: p.name || '',
        brand: p.brand || '',
        price: p.price || 0,
        category: p.category || '',
        // Keep metadata small — Vectorize has a 10KB metadata limit per vector
      },
    };
  });

  const outputPath = 'scripts/products_for_vectorize.json';
  writeFileSync(outputPath, JSON.stringify(records, null, 2));
  console.log(`Exported ${records.length} products to ${outputPath}`);
  
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
