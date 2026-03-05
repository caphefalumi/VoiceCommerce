import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { fetchCartOnAuth } from '@/store/auth';
import { authClient } from '@/lib/auth-client';

export const Route = createFileRoute('/oauth/callback')({
  component: OAuthCallbackPage,
});

function OAuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const finish = async () => {
      if (window.opener && !window.opener.closed) {
        // Popup flow: signal the opener and let its poll loop handle the rest
        window.opener.postMessage({ type: 'OAUTH_SUCCESS' }, '*');
        window.close();
        return;
      }

      // Non-popup fallback (e.g. same-tab redirect flow)
      const session = await authClient.getSession();
      const u = session?.data?.user;
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
  }, [navigate]);

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
