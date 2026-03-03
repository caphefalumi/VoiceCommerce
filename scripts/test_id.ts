import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';

const MONGODB_URI = 'mongodb+srv://admin:%40dminpr0@cluster0.in5tnwg.mongodb.net/tgdd';

await mongoose.connect(MONGODB_URI);
const db = mongoose.connection.db;

const id = "698d88579e285fcfc4ca9edd";
let doc1 = await db.collection('products').findOne({ _id: id });
let doc2 = await db.collection('products').findOne({ _id: new ObjectId(id) });

console.log("String ID found:", !!doc1);
console.log("ObjectId found:", !!doc2);

process.exit(0);
