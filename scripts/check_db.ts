import mongoose from 'mongoose';
import { writeFileSync } from 'fs';

const MONGODB_URI = 'mongodb://localhost:27017/tgdd';
await mongoose.connect(MONGODB_URI);
const db = mongoose.connection.db!;

// Mimic what Spring MongoTemplate does: db.products.find({}).limit(200)
const docs = await db.collection('products').find({}).limit(5).toArray();

const out = {
  collectionQueried: 'products',
  docsFound: docs.length,
  firstDocKeys: docs.length > 0 ? Object.keys(docs[0]) : [],
  idType: docs.length > 0 ? typeof docs[0]._id + ' / ' + docs[0]._id?.constructor?.name : 'N/A',
  firstDocId: docs.length > 0 ? String(docs[0]._id) : 'N/A',
  firstDocName: docs.length > 0 ? docs[0].name : 'N/A',
};

writeFileSync('scripts/db_check_result.json', JSON.stringify(out, null, 2), 'utf-8');
console.log('Written to scripts/db_check_result.json');
console.log(JSON.stringify(out, null, 2));
process.exit(0);
