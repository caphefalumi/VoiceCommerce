import { create } from 'zustand';
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
  refreshCart: () => Promise<void>;
  total: () => number;
}

import { useAuthStore } from './auth';
import { API_BASE } from '@/lib/api';

const normalizeCartItems = (items: unknown[]): CartItem[] => {
  return items
    .map((raw) => {
      const item = raw as Record<string, unknown>;
      const productId =
        typeof item.product_id === 'string'
          ? item.product_id
          : typeof item.id === 'string'
            ? item.id
            : '';
      const price = Number(item.price ?? 0);
      const quantity = Math.max(1, Number(item.quantity ?? 1));

      if (!productId || !Number.isFinite(price) || price <= 0) return null;

      return {
        ...(item as unknown as CartItem),
        id: productId,
        price,
        quantity,
      };
    })
    .filter((item): item is CartItem => item !== null);
};

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

export const useCartStore = create<CartState>()((set, get) => ({
  items: [],
  addToCart: (product, skipSync = false) => {
    if (!product.id || product.price == null || product.price <= 0) return;

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
    const safeItems = normalizeCartItems(Array.isArray(items) ? items : []);
    set({ items: safeItems });
  },
  refreshCart: async () => {
    const user = useAuthStore.getState().user;
    if (!user?.id) {
      set({ items: [] });
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/cart`, {
        credentials: 'include',
      });
      if (!res.ok) return;
      const data = await res.json();
      const items = Array.isArray(data) ? data : (data?.cart ?? []);
      const safeItems = normalizeCartItems(Array.isArray(items) ? items : []);
      set({ items: safeItems });
    } catch {}
  },
  total: () => {
    try {
      const state = get();
      if (!state) return 0;
      const items = state.items;
      if (!Array.isArray(items)) return 0;
      return items.reduce((acc, item) => acc + (item.price ?? 0) * (item.quantity ?? 0), 0);
    } catch {
      return 0;
    }
  },
}));
