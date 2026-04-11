import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { MailCheck, Loader2 } from 'lucide-react';
import { z } from 'zod';

const verifySearchSchema = z.object({
  token: z.string().optional(),
});

export const Route = createFileRoute('/verify-email')({
  validateSearch: (search: Record<string, unknown>) => verifySearchSchema.parse(search),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { token } = Route.useSearch();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Liên kết xác minh không hợp lệ hoặc đã hết hạn.');
      return;
    }

    authClient.verifyEmail({ query: { token } })
      .then((result) => {
        if (result?.error) {
          setStatus('error');
          setMessage(result.error.message ?? 'Xác minh email thất bại. Vui lòng thử lại.');
        } else {
          setStatus('success');
          setMessage('Email của bạn đã được xác minh thành công!');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Có lỗi xảy ra. Vui lòng thử lại.');
      });
  }, [token]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-50 mb-4">
            {status === 'loading' ? (
              <Loader2 className="w-7 h-7 text-red-500 animate-spin" />
            ) : (
              <MailCheck className="w-7 h-7 text-red-500" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Xác minh email</h1>

          {status === 'loading' && (
            <p className="text-sm text-gray-500">Đang xác minh email của bạn...</p>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <div className="px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
                {message}
              </div>
              <Link to="/login" search={{ redirect: '', error: '' }} className="block text-red-500 hover:underline text-sm font-medium">
                Tiến hành đăng nhập
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {message}
              </div>
              <Link to="/login" search={{ redirect: '', error: '' }} className="block text-red-500 hover:underline text-sm font-medium">
                Quay lại đăng nhập
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
