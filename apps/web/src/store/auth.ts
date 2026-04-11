import { create } from 'zustand';
import { authClient } from '@/lib/auth-client';
import { useCartStore } from './cart';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  _setUser: (user: AuthUser | null) => void;
  _setLoading: (v: boolean) => void;
}

export const fetchCartOnAuth = async () => {
  await useCartStore.getState().refreshCart();
};

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authClient.signIn.email({ email, password });
      if (result?.error) {
        set({ error: result.error.message ?? 'Đăng nhập thất bại', isLoading: false });
        throw new Error(result.error.message ?? 'Đăng nhập thất bại');
      }
      const u = result?.data?.user ?? null;
      if (u) {
        const authUser: AuthUser = {
          id: u.id,
          email: u.email,
          name: u.name ?? '',
          role: (u as { role?: string }).role ?? 'user',
        };
        set({ user: authUser, isLoading: false });
        fetchCartOnAuth();
      } else {
        set({ isLoading: false });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đăng nhập thất bại';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authClient.signUp.email({ name, email, password });
      if (result?.error) {
        set({ error: result.error.message ?? 'Đăng ký thất bại', isLoading: false });
        throw new Error(result.error.message ?? 'Đăng ký thất bại');
      }
      const u = result?.data?.user ?? null;
      if (u) {
        const authUser: AuthUser = {
          id: u.id,
          email: u.email,
          name: u.name ?? '',
          role: (u as { role?: string }).role ?? 'user',
        };
        set({ user: authUser, isLoading: false });
        fetchCartOnAuth();
      } else {
        set({ isLoading: false });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đăng ký thất bại';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    await authClient.signOut();
    set({ user: null, error: null });
    useCartStore.getState().clearCart();
  },

  clearError: () => set({ error: null }),

  _setUser: (user) => set({ user }),
  _setLoading: (v) => set({ isLoading: v }),
}));
