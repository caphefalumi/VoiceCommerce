export interface Review {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  images: string[];
  category: string; // matches Category.id
  specs: Record<string, string>; // e.g. { "Screen": "6.1 inch", "RAM": "8GB" }
  rating: number;
  reviewCount: number;
  isFlashSale?: boolean;
  isNew?: boolean;
  stock: number;
  description: string;
  reviews?: Review[];
}

export interface Category {
  id: string;
  name: string;
  icon?: string; // lucide icon name or image url
}
