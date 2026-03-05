import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { KeyRound, Loader2 } from 'lucide-react';
import { z } from 'zod';

const resetSearchSchema = z.object({
  token: z.string().optional(),
});

export const Route = createFileRoute('/reset-password')({
  validateSearch: (search: Record<string, unknown>) => resetSearchSchema.parse(search),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { token } = Route.useSearch();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    if (!token) {
      setError('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
      return;
    }
    setIsLoading(true);
    try {
      const result = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      if (result?.error) {
        setError(result.error.message ?? 'Có lỗi xảy ra. Vui lòng thử lại.');
      } else {
        setDone(true);
        setTimeout(() => navigate({ to: '/login' }), 2500);
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
              <KeyRound className="w-7 h-7 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Đặt lại mật khẩu</h1>
            <p className="text-sm text-gray-500 mt-1">Nhập mật khẩu mới của bạn</p>
          </div>

          {done ? (
            <div className="text-center space-y-4">
              <div className="px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
                Mật khẩu đã được đặt lại thành công. Đang chuyển hướng đến trang đăng nhập...
              </div>
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
                    htmlFor="rp-password"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Mật khẩu mới
                  </label>
                  <input
                    id="rp-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ít nhất 6 ký tự"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent text-sm transition"
                  />
                </div>

                <div>
                  <label
                    htmlFor="rp-confirm"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Xác nhận mật khẩu mới
                  </label>
                  <input
                    id="rp-confirm"
                    type="password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Nhập lại mật khẩu"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent text-sm transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !token}
                  className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Đặt lại mật khẩu
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-gray-500">
                <Link to="/login" className="text-red-500 hover:underline font-medium">
                  Quay lại đăng nhập
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
