import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useEffect, useState, useMemo } from 'react';
import { useCartStore } from '@/store/cart';
import { API_BASE } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { z } from 'zod';

const checkoutSuccessSearchSchema = z.object({
  session_id: z.string().optional(),
});

export const Route = createFileRoute('/checkout-success')({
  validateSearch: (search: Record<string, unknown>) => checkoutSuccessSearchSchema.parse(search),
  component: CheckoutSuccessPage,
});

function CheckoutSuccessPage() {
  const navigate = useNavigate();
  
  const sessionId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('session_id') || undefined;
  }, []);
  
  const { clearCart } = useCartStore();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setStatus('failed');
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/payment-status/${sessionId}`, {
          credentials: 'include',
        });

        if (res.ok) {
          const data = await res.json() as { status?: string; payment_status?: string };
          if (data.payment_status === 'paid' || data.status === 'complete') {
            setStatus('success');
            clearCart();
          } else {
            setStatus('failed');
          }
        } else {
          setStatus('failed');
        }
      } catch {
        setStatus('failed');
      }
    };

    verifyPayment();
  }, [sessionId, clearCart]);

  const handleClose = () => {
    navigate({ to: '/' });
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f3f3]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Đang xác nhận thanh toán...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f3f3f3] min-h-screen flex items-center justify-center">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <Link to="/">
            <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-white rounded-full mb-6">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </Link>

          <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-200 text-center">
            {status === 'success' ? (
              <>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-6">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Thanh toán thành công!</h1>
                <p className="text-gray-600 mb-6">
                  Cảm ơn bạn đã mua hàng. Đơn hàng của bạn đang được xử lý và sẽ sớm được giao đến bạn.
                </p>
              </>
            ) : (
              <>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-6">
                  <XCircle className="h-10 w-10 text-red-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Thanh toán thất bại</h1>
                <p className="text-gray-600 mb-6">
                  Đã xảy ra lỗi trong quá trình thanh toán. Vui lòng thử lại hoặc liên hệ hỗ trợ.
                </p>
              </>
            )}

            <div className="flex flex-col gap-3">
              <Button
                onClick={handleClose}
                className="w-full h-12 font-bold bg-destructive hover:bg-destructive/90 text-white"
              >
                Về trang chủ
              </Button>
              {status === 'failed' && (
                <Link to="/checkout" className="w-full">
                  <Button
                    variant="outline"
                    className="w-full h-12 font-bold"
                  >
                    Thử lại
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
