import { describe, it, expect } from 'vitest';
import { filterProducts } from './filter';
import type { FilterOptions } from './filter';
import type { Product } from '../types/product';

const mockProducts: Product[] = [
  {
    id: '1',
    name: 'iPhone 15',
    brand: 'Apple',
    price: 20000000,
    category: 'phone',
    images: [],
    specs: {},
    rating: 4.5,
    reviewCount: 10,
    stock: 10,
    description: 'test',
  },
  {
    id: '2',
    name: 'S24 Ultra',
    brand: 'Samsung',
    price: 25000000,
    category: 'phone',
    images: [],
    specs: {},
    rating: 4.8,
    reviewCount: 20,
    stock: 5,
    description: 'test',
  },
  {
    id: '3',
    name: 'MacBook M3',
    brand: 'Apple',
    price: 35000000,
    category: 'laptop',
    images: [],
    specs: {},
    rating: 4.9,
    reviewCount: 15,
    stock: 2,
    description: 'test',
  },
  {
    id: '4',
    name: 'Logitech Mouse',
    brand: 'Logitech',
    price: 1000000,
    category: 'accessory',
    images: [],
    specs: {},
    rating: 4.2,
    reviewCount: 50,
    stock: 100,
    description: 'test',
  },
];

describe('filterProducts', () => {
  it('should return all products when no options are provided', () => {
    const options: FilterOptions = {};
    const result = filterProducts(mockProducts, options);
    expect(result).toHaveLength(4);
  });

  it('should filter by category', () => {
    const options: FilterOptions = { category: 'phone' };
    const result = filterProducts(mockProducts, options);
    expect(result).toHaveLength(2);
    expect(result.every((p) => p.category === 'phone')).toBe(true);
  });

  it('should filter by min price', () => {
    const options: FilterOptions = { minPrice: 20000000 };
    const result = filterProducts(mockProducts, options);
    expect(result).toHaveLength(3);
    expect(result.every((p) => p.price >= 20000000)).toBe(true);
  });

  it('should filter by max price', () => {
    const options: FilterOptions = { maxPrice: 10000000 };
    const result = filterProducts(mockProducts, options);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('4');
  });

  it('should filter by price range', () => {
    const options: FilterOptions = { minPrice: 20000000, maxPrice: 30000000 };
    const result = filterProducts(mockProducts, options);
    expect(result).toHaveLength(2);
    expect(result.every((p) => p.price >= 20000000 && p.price <= 30000000)).toBe(true);
  });

  it('should filter by brand (array)', () => {
    const options: FilterOptions = { brand: ['Apple'] };
    const result = filterProducts(mockProducts, options);
    expect(result).toHaveLength(2);
    expect(result.every((p) => p.brand === 'Apple')).toBe(true);
  });

  it('should filter by multiple brands', () => {
    const options: FilterOptions = { brand: ['Apple', 'Samsung'] };
    const result = filterProducts(mockProducts, options);
    expect(result).toHaveLength(3);
  });

  it('should combine multiple filters', () => {
    const options: FilterOptions = {
      category: 'phone',
      brand: ['Apple'],
      minPrice: 15000000,
    };
    const result = filterProducts(mockProducts, options);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });
});
