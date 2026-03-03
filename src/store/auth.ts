import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { API_BASE } from '@/lib/api';
import { useCartStore } from './cart';

export const fetchCartOnAuth = async (token: string) => {
  try {
    const res = await fetch(`${API_BASE}/api/cart`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const cart = await res.json();
      useCartStore.getState().setCart(cart);
    }
  } catch (e) {
    console.error('Failed to fetch user cart', e);
  }
};

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Đăng nhập thất bại');
          set({ user: data.user, token: data.token, isLoading: false });
          fetchCartOnAuth(data.token);
        } catch (err: unknown) {
          set({ error: err instanceof Error ? err.message : 'Đăng nhập thất bại', isLoading: false });
          throw err;
        }
      },

      register: async (name, email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Đăng ký thất bại');
          set({ user: data.user, token: data.token, isLoading: false });
          fetchCartOnAuth(data.token);
        } catch (err: unknown) {
          set({ error: err instanceof Error ? err.message : 'Đăng ký thất bại', isLoading: false });
          throw err;
        }
      },

      logout: () => {
        set({ user: null, token: null, error: null });
        useCartStore.getState().clearCart();
      },
      clearError: () => set({ error: null }),
    }),
    {
      name: 'tgdd-auth',
      // Only persist user and token — not loading/error state
      partialize: (s) => ({ user: s.user, token: s.token }),
    }
  )
);

/** Helper: returns the Authorization header value for fetch calls */
export function authHeader(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
