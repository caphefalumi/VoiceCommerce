import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '../types/product';

export interface CartItem extends Product {
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setCart: (items: CartItem[]) => void;
  total: () => number;
}

// Ensure auth is referenced safely for API calls. We will lazy load useAuthStore
import { useAuthStore } from './auth';
import { API_BASE } from '@/lib/api';

const syncCartAPI = async (items: CartItem[]) => {
  const token = useAuthStore.getState().token;
  if (!token) return;
  try {
    await fetch(`${API_BASE}/api/cart`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(items),
    });
  } catch (e) {
    console.error('Failed to sync cart', e);
  }
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addToCart: (product) => {
        const items = get().items;
        const existingItem = items.find((item) => item.id === product.id);

        let newItems;
        if (existingItem) {
          newItems = items.map((item) =>
            item.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        } else {
          newItems = [...items, { ...product, quantity: 1 }];
        }
        set({ items: newItems });
        syncCartAPI(newItems);
      },
      removeFromCart: (productId) => {
        const newItems = get().items.filter((item) => item.id !== productId);
        set({ items: newItems });
        syncCartAPI(newItems);
      },
      updateQuantity: (productId, quantity) => {
        if (quantity < 1) return;
        const newItems = get().items.map((item) =>
          item.id === productId ? { ...item, quantity } : item
        );
        set({ items: newItems });
        syncCartAPI(newItems);
      },
      clearCart: () => {
        set({ items: [] });
      },
      setCart: (items) => {
        set({ items });
      },
      total: () => {
        return get().items.reduce(
          (acc, item) => acc + item.price * item.quantity,
          0
        );
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);
