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

// Ensure auth is referenced safely for API calls. We will lazy load useAuthStore
import { useAuthStore } from './auth';
import { API_BASE } from '@/lib/api';

const syncCartAPI = async (method: string, productId: string, quantity?: number) => {
  const user = useAuthStore.getState().user;
  const token = useAuthStore.getState().token;
  if (!user?.id || !token) return;

  try {
    if (method === 'DELETE') {
      await fetch(`${API_BASE}/api/cart/${user.id}/${productId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } else if (method === 'POST') {
      await fetch(`${API_BASE}/api/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_id: user.id, product_id: productId, quantity }),
      });
    }
  } catch (e) {
    console.error(`Failed to sync cart (${method})`, e);
  }
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
        // Inform backend of +1 quantity or new item if sync is allowed
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
        // The API backend 'updates' by adding quantity, or if we had a dedicated PUT endpoint we'd use it.
        // For simplicity with the existing POST endpoint, we send the difference:
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
        return get().items.reduce((acc, item) => acc + item.price * item.quantity, 0);
      },
    }),
    {
      name: 'cart-storage',
    },
  ),
);
