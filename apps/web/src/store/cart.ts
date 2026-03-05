import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '../types/product';

export interface CartItem extends Product {
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addToCart: (product: Product, skipSync?: boolean) => void;
  removeFromCart: (productId: string, skipSync?: boolean) => void;
  updateQuantity: (productId: string, quantity: number, skipSync?: boolean) => void;
  clearCart: () => void;
  setCart: (items: CartItem[]) => void;
  total: () => number;
}

import { useAuthStore } from './auth';
import { API_BASE } from '@/lib/api';

const syncCartAPI = async (method: string, productId: string, quantity?: number) => {
  const user = useAuthStore.getState().user;
  if (!user?.id) return;

  try {
    if (method === 'DELETE') {
      await fetch(`${API_BASE}/api/cart/${productId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
    } else if (method === 'POST') {
      await fetch(`${API_BASE}/api/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ product_id: productId, quantity }),
      });
    }
  } catch {}
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addToCart: (product, skipSync = false) => {
        const items = get().items;
        const existingItem = items.find((item) => item.id === product.id);

        let newItems;
        if (existingItem) {
          newItems = items.map((item) =>
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
          );
        } else {
          newItems = [...items, { ...product, quantity: 1 }];
        }
        set({ items: newItems });
        if (!skipSync) syncCartAPI('POST', product.id, 1);
      },
      removeFromCart: (productId, skipSync = false) => {
        const newItems = get().items.filter((item) => item.id !== productId);
        set({ items: newItems });
        if (!skipSync) syncCartAPI('DELETE', productId);
      },
      updateQuantity: (productId, quantity, skipSync = false) => {
        if (quantity < 1) return;
        const items = get().items;
        const oldItem = items.find((i) => i.id === productId);
        const oldQty = oldItem ? oldItem.quantity : 0;
        const diff = quantity - oldQty;

        const newItems = items.map((item) =>
          item.id === productId ? { ...item, quantity } : item,
        );
        set({ items: newItems });
        if (diff !== 0 && !skipSync) {
          syncCartAPI('POST', productId, diff);
        }
      },
      clearCart: () => {
        set({ items: [] });
      },
      setCart: (items) => {
        set({ items });
      },
      total: () => {
        return get().items.reduce((acc, item) => acc + (item.price ?? 0) * (item.quantity ?? 0), 0);
      },
    }),
    {
      name: 'cart-storage',
    },
  ),
);
