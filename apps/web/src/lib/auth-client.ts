import { API_BASE } from './api';

type AuthUser = {
  id: string;
  email: string;
  name: string;
  role?: string;
};

type AuthResponse = {
  user?: AuthUser | null;
  token?: string | null;
  error?: string;
  success?: boolean;
};

type AuthResult<T> = {
  data?: T;
  error?: { message: string };
};

const AUTH_TOKEN_KEY = 'tgdd_auth_token';

function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function setAuthToken(token: string | null | undefined) {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const msg = (body as { error?: string } | null)?.error ?? `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return body as T;
}

async function safeResult<T>(fn: () => Promise<T>): Promise<AuthResult<T>> {
  try {
    const data = await fn();
    return { data };
  } catch (e: unknown) {
    return {
      error: {
        message: e instanceof Error ? e.message : 'Request failed',
      },
    };
  }
}

export const authClient = {
  signIn: {
    email: async (payload: { email: string; password: string }) => safeResult(async () => {
      const res = await request<AuthResponse>('/api/auth/sign-in/email', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setAuthToken(res.token);
      return { user: res.user ?? null };
    }),
    social: async ({ provider, callbackURL }: { provider: 'google'; callbackURL: string }) => {
      if (provider !== 'google') {
        return { error: { message: 'Only google provider is supported' } };
      }
      const res = await safeResult(async () => {
        const data = await request<{ url: string }>(`/api/mobile/google-url?callbackURL=${encodeURIComponent(callbackURL)}`);
        return data;
      });
      return res;
    },
  },

  oauth: {
    exchangeGoogleCallback: async (payload: { code: string; state: string }) => safeResult(async () => {
      const res = await request<AuthResponse>(
        `/api/mobile/google-callback?code=${encodeURIComponent(payload.code)}&state=${encodeURIComponent(payload.state)}`,
      );
      setAuthToken(res.token);
      return { user: res.user ?? null };
    }),
  },

  signUp: {
    email: async (payload: { name: string; email: string; password: string }) => safeResult(async () => {
      const res = await request<AuthResponse>('/api/auth/sign-up/email', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setAuthToken(res.token);
      return { user: res.user ?? null };
    }),
  },

  signOut: async () => {
    await request('/api/auth/sign-out', { method: 'POST' });
    setAuthToken(null);
  },

  getSession: async () => {
    const res = await safeResult(async () => request<AuthResponse>('/api/auth/get-session'));
    if (res.data?.token) {
      setAuthToken(res.data.token);
    }
    return {
      data: res.data ? { user: res.data.user ?? null } : undefined,
      error: res.error,
    };
  },

  requestPasswordReset: async (payload: { email: string; redirectTo?: string }) => safeResult(async () => {
    const response = await request<AuthResponse>('/api/auth/forget-password', {
      method: 'POST',
      body: JSON.stringify({ email: payload.email, redirectTo: payload.redirectTo }),
    });
    return response;
  }),

  resetPassword: async (payload: { token: string; newPassword: string }) => safeResult(async () => {
    const response = await request<AuthResponse>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response;
  }),

  verifyEmail: async ({ query }: { query: { token: string } }) => safeResult(async () => {
    const response = await request<AuthResponse>(`/api/auth/verify-email?token=${encodeURIComponent(query.token)}`);
    return response;
  }),

  updateUser: async (payload: { name: string }) => safeResult(async () => {
    const response = await request<AuthResponse>('/api/auth/user', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return response;
  }),
};
