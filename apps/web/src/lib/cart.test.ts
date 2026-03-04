import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '../store/cart';
import type { Product } from '../types/product';

const mockProduct: Product = {
  id: '1',
  name: 'Test Product',
  brand: 'Test Brand',
  price: 1000,
  images: ['test.jpg'],
  category: 'test-category',
  specs: {},
  rating: 4.5,
  reviewCount: 10,
  stock: 10,
  description: 'Test Description',
};

describe('Cart Store', () => {
  beforeEach(() => {
    useCartStore.getState().clearCart();
  });

  it('should add a product to the cart', () => {
    useCartStore.getState().addToCart(mockProduct);
    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(mockProduct.id);
    expect(items[0].quantity).toBe(1);
  });

  it('should increment quantity if the product is already in the cart', () => {
    useCartStore.getState().addToCart(mockProduct);
    useCartStore.getState().addToCart(mockProduct);
    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
  });

  it('should remove a product from the cart', () => {
    useCartStore.getState().addToCart(mockProduct);
    useCartStore.getState().removeFromCart(mockProduct.id);
    const { items } = useCartStore.getState();
    expect(items).toHaveLength(0);
  });

  it('should update product quantity', () => {
    useCartStore.getState().addToCart(mockProduct);
    useCartStore.getState().updateQuantity(mockProduct.id, 5);
    const { items } = useCartStore.getState();
    expect(items[0].quantity).toBe(5);
  });

  it('should not update quantity to less than 1', () => {
    useCartStore.getState().addToCart(mockProduct);
    useCartStore.getState().updateQuantity(mockProduct.id, 0);
    const { items } = useCartStore.getState();
    expect(items[0].quantity).toBe(1);
  });

  it('should clear the cart', () => {
    useCartStore.getState().addToCart(mockProduct);
    useCartStore.getState().clearCart();
    const { items } = useCartStore.getState();
    expect(items).toHaveLength(0);
  });

  it('should calculate total price correctly', () => {
    useCartStore.getState().addToCart(mockProduct);
    useCartStore.getState().addToCart({ ...mockProduct, id: '2', price: 500 });
    useCartStore.getState().updateQuantity('1', 2);
    expect(useCartStore.getState().total()).toBe(2500);
  });
});
