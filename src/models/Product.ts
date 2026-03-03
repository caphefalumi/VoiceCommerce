import mongoose, { Schema, Document } from 'mongoose';

export interface ISpec {
  label: string;
  value?: string;
}

export interface IReview {
  author?: string;
  content: string;
  rating: number;
  date?: Date;
}

export interface IProduct extends Document {
  url: string;
  name: string;
  price: number;
  originalPrice?: number;
  category?: string;
  brand?: string;
  rating?: number;
  reviewCount?: number;
  stock?: number;
  description?: string;
  images: string[];
  specs: ISpec[];
  reviews: IReview[];
  embedding?: number[];
}

const ProductSchema: Schema = new Schema({
  url: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  originalPrice: { type: Number },
  category: { type: String },
  brand: { type: String },
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  description: { type: String },
  images: [{ type: String }],
  specs: [{
    _id: false,
    label: { type: String, required: true },
    value: { type: String }
  }],
  reviews: [{
    _id: false,
    author: { type: String },
    content: { type: String, required: true },
    rating: { type: Number, required: true },
    date: { type: Date, default: Date.now }
  }],
  embedding: { type: [Number] }
}, {
  timestamps: true,
  collection: '_Product'
});

export default mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
