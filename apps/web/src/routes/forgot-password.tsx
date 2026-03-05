import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { Mail, Loader2 } from 'lucide-react';

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (result?.error) {
        setError(result.error.message ?? 'Có lỗi xảy ra. Vui lòng thử lại.');
      } else {
        setSent(true);
      }
    } catch {
      setError('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-50 mb-4">
              <Mail className="w-7 h-7 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Quên mật khẩu</h1>
            <p className="text-sm text-gray-500 mt-1">
              Nhập email để nhận liên kết đặt lại mật khẩu
            </p>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <div className="px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
                Email đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư của bạn.
              </div>
              <Link to="/login" className="text-red-500 hover:underline text-sm font-medium">
                Quay lại đăng nhập
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="fp-email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email
                  </label>
                  <input
                    id="fp-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent text-sm transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Gửi email đặt lại mật khẩu
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-gray-500">
                Nhớ mật khẩu rồi?{' '}
                <Link to="/login" className="text-red-500 hover:underline font-medium">
                  Đăng nhập
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
