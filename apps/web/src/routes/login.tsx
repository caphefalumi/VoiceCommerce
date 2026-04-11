import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useState, useRef } from 'react';
import { useAuthStore } from '@/store/auth';
import { authClient } from '@/lib/auth-client';
import { Eye, EyeOff, LogIn, Loader2, X } from 'lucide-react';
import { fetchCartOnAuth } from '@/store/auth';

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : '',
    error: typeof search.error === 'string' ? search.error : '',
  }),
  component: LoginPage,
});

const POPUP_WIDTH = 500;
const POPUP_HEIGHT = 620;

function getPopupFeatures() {
  const left = Math.round(window.screenX + (window.outerWidth - POPUP_WIDTH) / 2);
  const top = Math.round(window.screenY + (window.outerHeight - POPUP_HEIGHT) / 2);
  return `width=${POPUP_WIDTH},height=${POPUP_HEIGHT},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`;
}

function LoginPage() {
  const navigate = useNavigate();
  const { redirect, error: oauthError } = Route.useSearch();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleGoogle = async (e: React.MouseEvent) => {
    e.preventDefault();
    setGoogleLoading(true);

    const { data, error: socialError } = await authClient.signIn.social({
      provider: 'google',
      callbackURL: `${window.location.origin}/oauth/callback`,
    });

    if (socialError) {
      useAuthStore.getState().clearError();
      useAuthStore.setState({ error: socialError.message });
      setGoogleLoading(false);
      return;
    }

    const url = (data as { url?: string })?.url;
    if (!url) {
      setGoogleLoading(false);
      return;
    }

    const popup = window.open(url, 'google-oauth', getPopupFeatures());
    popupRef.current = popup;

    if (!popup || popup.closed) {
      setGoogleLoading(false);
      return;
    }

    const onMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_ERROR') {
        clearInterval(pollRef.current!);
        setGoogleLoading(false);
        useAuthStore.setState({ error: event.data.error || 'Google sign-in failed' });
        window.removeEventListener('message', onMessage);
        return;
      }

      if (event.data?.type === 'OAUTH_SUCCESS') {
        const session = await authClient.getSession();
        const u = session?.data?.user;
        if (u) {
          clearInterval(pollRef.current!);
          useAuthStore.getState()._setUser({
            id: u.id,
            email: u.email,
            name: u.name ?? '',
            role: (u as { role?: string }).role ?? 'user',
          });
          fetchCartOnAuth();
          navigate({ to: redirect || '/' });
        }
        setGoogleLoading(false);
        window.removeEventListener('message', onMessage);
      }
    };
    window.addEventListener('message', onMessage);

    pollRef.current = setInterval(async () => {
      if (popup?.closed) {
        clearInterval(pollRef.current!);
        setGoogleLoading(false);
        window.removeEventListener('message', onMessage);
        return;
      }

      try {
        const session = await authClient.getSession();
        if (session?.data?.user) {
          clearInterval(pollRef.current!);
          popup.close();
          const u = session.data.user;
          useAuthStore.getState()._setUser({
            id: u.id,
            email: u.email,
            name: u.name ?? '',
            role: (u as { role?: string }).role ?? 'user',
          });
          fetchCartOnAuth();
          navigate({ to: redirect || '/' });
          setGoogleLoading(false);
          window.removeEventListener('message', onMessage);
        }
      } catch { }
    }, 1000);

    setTimeout(() => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        setGoogleLoading(false);
        window.removeEventListener('message', onMessage);
      }
    }, 5 * 60 * 1000);
  };

  const cancelGoogle = () => {
    popupRef.current?.close();
    popupRef.current = null;
    clearInterval(pollRef.current!);
    setGoogleLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(email, password);
      navigate({ to: redirect || '/' });
    } catch {
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-gray-50">
      {googleLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-80 p-8 flex flex-col items-center gap-5 relative">
            <button
              onClick={cancelGoogle}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition"
              aria-label="Huỷ"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-6 h-6">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-800 text-sm">Đang mở cửa sổ Google</p>
              <p className="text-xs text-gray-400 mt-1">Hoàn tất đăng nhập trong cửa sổ vừa mở</p>
            </div>
            <Loader2 className="w-5 h-5 animate-spin text-red-400" />
          </div>
        </div>
      )}

      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-50 mb-4">
              <LogIn className="w-7 h-7 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Đăng nhập</h1>
            <p className="text-sm text-gray-500 mt-1">Chào mừng bạn quay lại TGDD</p>
          </div>

          {(error || oauthError) && (
            <div className="mb-5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {error || oauthError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent text-sm transition"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent text-sm transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex justify-end mt-1">
                <Link to="/forgot-password" className="text-xs text-red-500 hover:underline">
                  Quên mật khẩu?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Đăng nhập
            </button>
          </form>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">hoặc</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading}
            className="mt-4 w-full py-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700 flex items-center justify-center gap-3 transition disabled:opacity-60"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" className="w-4 h-4">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            Đăng nhập với Google
          </button>

          <p className="mt-6 text-center text-sm text-gray-500">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="text-red-500 hover:underline font-medium">
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
