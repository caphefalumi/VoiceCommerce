import type { Product } from '../types/product';

export type FilterOptions = {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  brand?: string[];
};

export const filterProducts = (products: Product[], options: FilterOptions): Product[] => {
  return products.filter((product) => {
    if (options.category && product.category !== options.category) {
      return false;
    }

    if (options.minPrice !== undefined && product.price < options.minPrice) {
      return false;
    }

    if (options.maxPrice !== undefined && product.price > options.maxPrice) {
      return false;
    }

    if (options.brand && options.brand.length > 0 && !options.brand.includes(product.brand)) {
      return false;
    }

    return true;
  });
};
