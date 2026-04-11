import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { fetchCartOnAuth } from '@/store/auth';
import { authClient } from '@/lib/auth-client';
import { z } from 'zod';

const oauthSearchSchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
});

export const Route = createFileRoute('/oauth/callback')({
  validateSearch: (search: Record<string, unknown>) => oauthSearchSchema.parse(search),
  component: OAuthCallbackPage,
});

function OAuthCallbackPage() {
  const navigate = useNavigate();
  const { code, state, error } = Route.useSearch();

  useEffect(() => {
    const finish = async () => {
      if (error) {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: 'OAUTH_ERROR', error }, '*');
          window.close();
          return;
        }
        navigate({ to: '/login', search: { redirect: '', error } });
        return;
      }

      let userFromExchange: { id: string; email: string; name?: string; role?: string } | null = null;
      if (code && state) {
        const exchanged = await authClient.oauth.exchangeGoogleCallback({ code, state });
        if (exchanged.error) {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage({ type: 'OAUTH_ERROR', error: exchanged.error.message }, '*');
            window.close();
            return;
          }
          navigate({ to: '/login', search: { redirect: '', error: exchanged.error.message } });
          return;
        }
        userFromExchange = exchanged.data?.user ?? null;
      }

      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'OAUTH_SUCCESS' }, '*');
        window.close();
        return;
      }

      const session = await authClient.getSession();
      const u = userFromExchange ?? session?.data?.user ?? null;
      if (u) {
        useAuthStore.getState()._setUser({
          id: u.id,
          email: u.email,
          name: u.name ?? '',
          role: (u as { role?: string }).role ?? 'user',
        });
        fetchCartOnAuth();
      }
      navigate({ to: '/' });
    };

    finish();
  }, [code, error, navigate, state]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white">
      <svg className="w-10 h-10 animate-spin text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      <p className="text-sm text-gray-500">Đang hoàn tất đăng nhập…</p>
    </div>
  );
}
