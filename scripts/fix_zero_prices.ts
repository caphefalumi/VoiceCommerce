/**
 * Fix products with price = 0 in MongoDB:
 * - Replace with a random price between 2,000,000 and 20,000,000 VND
 * Then re-export products_for_vectorize.json
 *
 * Run: npx tsx scripts/fix_zero_prices.ts
 */
import mongoose from 'mongoose';
import { writeFileSync } from 'fs';

const MONGODB_URI = 'mongodb+srv://admin:%40dminpr0@cluster0.in5tnwg.mongodb.net/tgdd';

const randomPrice = () =>
  Math.round((2_000_000 + Math.random() * 18_000_000) / 100_000) * 100_000;

async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;
  const col = db.collection('products');

  // Count zero-price products
  const zeroPriceCount = await col.countDocuments({ price: 0 });
  console.log(`Found ${zeroPriceCount} products with price = 0`);

  if (zeroPriceCount > 0) {
    // Get their IDs so we can update each with a unique random price
    const zeroPriceProducts = await col.find({ price: 0 }).project({ _id: 1 }).toArray();
    
    let updated = 0;
    for (const p of zeroPriceProducts) {
      const newPrice = randomPrice();
      await col.updateOne({ _id: p._id }, { $set: { price: newPrice, originalPrice: newPrice } });
      updated++;
      if (updated % 50 === 0) process.stdout.write(`\rUpdated ${updated}/${zeroPriceCount}...`);
    }
    console.log(`\n✅  Updated ${updated} products with random prices`);
  }

  // --- Re-export products_for_vectorize.json ---
  console.log('📦  Re-exporting all products for Vectorize...');
  const allProducts = await col.find({}).toArray();
  console.log(`Total products: ${allProducts.length}`);

  const records = allProducts.map((p) => {
    const specsText = Array.isArray(p.specs)
      ? p.specs.map((s: any) => `${s.label}: ${s.value || ''}`).join(', ')
      : '';

    const text = [
      p.name,
      p.brand,
      p.category,
      p.description,
      specsText,
      p.price ? `Giá: ${Number(p.price).toLocaleString('vi-VN')} VND` : '',
    ].filter(Boolean).join(' | ');

    return {
      id: p._id.toString(),
      text,
      metadata: {
        name: p.name || '',
        brand: p.brand || '',
        price: p.price || 0,
        category: p.category || '',
      },
    };
  });

  const outputPath = 'scripts/products_for_vectorize.json';
  writeFileSync(outputPath, JSON.stringify(records, null, 2));
  console.log(`✅  Exported ${records.length} products → ${outputPath}`);

  // Quick sanity check
  const stillZero = records.filter(r => r.metadata.price === 0).length;
  if (stillZero > 0) {
    console.warn(`⚠️  ${stillZero} products still have price = 0`);
  } else {
    console.log('🎉  All products have non-zero prices!');
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
