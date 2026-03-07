import { createFileRoute, redirect } from '@tanstack/react-router';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { authClient } from '@/lib/auth-client';
import { User, Loader2 } from 'lucide-react';

export const Route = createFileRoute('/account/settings')({
  beforeLoad: async () => {
    let currentUser = useAuthStore.getState().user;
    if (!currentUser) {
      const session = await authClient.getSession();
      if (!session?.data?.user) throw redirect({ to: '/login', search: { redirect: '/account/settings' } });
      const u = session.data.user;
      useAuthStore.getState()._setUser({
        id: u.id,
        email: u.email,
        name: u.name ?? '',
        role: (u as { role?: string }).role ?? 'user',
      });
    }
  },
  component: AccountSettingsPage,
});

function AccountSettingsPage() {
  const { user, _setUser } = useAuthStore();
  const [name, setName] = useState(user?.name ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    if (!name.trim()) {
      setError('Vui lòng nhập họ và tên');
      return;
    }
    setIsLoading(true);
    try {
      const result = await authClient.updateUser({ name: name.trim() });
      if (result?.error) {
        setError(result.error.message ?? 'Cập nhật thất bại. Vui lòng thử lại.');
      } else {
        if (user) _setUser({ ...user, name: name.trim() });
        setSuccess(true);
      }
    } catch {
      setError('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-xl">
      <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
            <User className="w-7 h-7 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cài đặt tài khoản</h1>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>

        {error && (
          <div className="mb-5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-5 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
            Thông tin đã được cập nhật thành công.
          </div>
        )}

        <form onSubmit={handleUpdateName} className="space-y-5">
          <div>
            <label htmlFor="settings-name" className="block text-sm font-medium text-gray-700 mb-1">
              Họ và tên
            </label>
            <input
              id="settings-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nguyễn Văn A"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent text-sm transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              disabled
              value={user?.email ?? ''}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">Email không thể thay đổi</p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Lưu thay đổi
          </button>
        </form>
      </div>
    </div>
  );
}
