
import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb+srv://admin:%40dminpr0@cluster0.in5tnwg.mongodb.net/tgdd';

await mongoose.connect(MONGODB_URI);
const db = mongoose.connection.db;
const collections = await db.listCollections().toArray();
console.log('Collections:', collections.map(c => c.name));

const products = await db.collection('products').find({}).limit(3).toArray();
console.log('Products in "products" collection:', products.length);
if (products.length > 0) {
  console.log('First product:', JSON.stringify(products[0], null, 2));
}
process.exit(0);
