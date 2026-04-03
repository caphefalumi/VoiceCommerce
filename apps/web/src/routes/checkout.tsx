import { createFileRoute, useNavigate, Link, redirect } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useCartStore } from '@/store/cart';
import { useAuthStore } from '@/store/auth';
import { authClient } from '@/lib/auth-client';
import { API_BASE } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, CheckCircle2, Loader2, CreditCard, Truck } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export const Route = createFileRoute('/checkout')({
  beforeLoad: async () => {
    let currentUser = useAuthStore.getState().user;
    if (!currentUser) {
      const session = await authClient.getSession();
      if (!session?.data?.user) throw redirect({ to: '/login', search: { redirect: '/checkout' } });
      const u = session.data.user;
      useAuthStore.getState()._setUser({
        id: u.id,
        email: u.email,
        name: u.name ?? '',
        role: (u as { role?: string }).role ?? 'user',
      });
    }
  },
  component: CheckoutPage,
});

type PaymentMethod = 'cod' | 'stripe';

function CheckoutPage() {
  const navigate = useNavigate();
  const { items, total, clearCart, refreshCart } = useCartStore();
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Vui lòng nhập họ tên';
    if (!formData.phone.trim()) newErrors.phone = 'Vui lòng nhập số điện thoại';
    else if (!/^\d{10}$/.test(formData.phone.trim()))
      newErrors.phone = 'Số điện thoại không hợp lệ';
    if (!formData.address.trim()) newErrors.address = 'Vui lòng nhập địa chỉ';
    if (!formData.city.trim()) newErrors.city = 'Vui lòng nhập Tỉnh/Thành phố';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    setIsLoading(true);
    try {
      const session = await authClient.getSession();
      const currentUser = session?.data?.user;
      if (!currentUser) {
        setErrors({ submit: 'Vui lòng đăng nhập lại' });
        setIsLoading(false);
        return;
      }

      const orderItems = items.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        images: item.images,
      }));

      // If Stripe is selected, create checkout session and redirect
      if (paymentMethod === 'stripe') {
        const successUrl = `${window.location.origin}/checkout-success`;
        const cancelUrl = `${window.location.origin}/checkout`;
        
        const res = await fetch(`${API_BASE}/api/create-checkout-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            items: orderItems,
            user_id: currentUser.id,
            user_email: currentUser.email,
            user_name: formData.name,
            shipping_address: {
              name: formData.name,
              phone: formData.phone,
              address: formData.address,
              city: formData.city,
            },
            success_url: successUrl,
            cancel_url: cancelUrl,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.url) {
            window.location.href = data.url;
            return;
          }
        } else {
          const data = await res.json();
          setErrors({ submit: data.error || 'Tạo phiên thanh toán thất bại. Vui lòng thử lại.' });
        }
        setIsLoading(false);
        return;
      }

      // COD flow (existing)
      const res = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          user_id: currentUser.id,
          user_email: currentUser.email,
          user_name: formData.name,
          items: orderItems,
          total_price: total(),
          shipping_address: {
            name: formData.name,
            phone: formData.phone,
            address: formData.address,
            city: formData.city,
          },
        }),
      });

      if (res.ok) {
        setShowSuccess(true);
      } else {
        const data = await res.json();
        setErrors({ submit: data.error || 'Đặt hàng thất bại. Vui lòng thử lại.' });
      }
    } catch {
      setErrors({ submit: 'Có lỗi xảy ra. Vui lòng thử lại.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseSuccess = () => {
    clearCart();
    setShowSuccess(false);
    navigate({ to: '/' });
  };

  if (items.length === 0 && !showSuccess) {
    return (
      <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[60vh]">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Giỏ hàng trống</h1>
        <Link to="/">
          <Button>Tiếp tục mua sắm</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#f3f3f3] min-h-screen pb-20">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/cart">
            <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-white rounded-full">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-gray-900 uppercase">Thanh toán</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Thông tin giao hàng</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium text-gray-700">
                      Họ và tên <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="name"
                      placeholder="Nhập họ và tên"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={errors.name ? 'border-red-500' : ''}
                    />
                    {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="phone" className="text-sm font-medium text-gray-700">
                      Số điện thoại <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="phone"
                      placeholder="Nhập số điện thoại"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={errors.phone ? 'border-red-500' : ''}
                    />
                    {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="city" className="text-sm font-medium text-gray-700">
                    Tỉnh/Thành phố <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="city"
                    placeholder="Nhập Tỉnh/Thành phố"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className={errors.city ? 'border-red-500' : ''}
                  />
                  {errors.city && <p className="text-xs text-red-500">{errors.city}</p>}
                </div>

                  <div className="space-y-2">
                  <label htmlFor="address" className="text-sm font-medium text-gray-700">
                    Địa chỉ cụ thể <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="address"
                    placeholder="Số nhà, tên đường, phường/xã..."
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className={errors.address ? 'border-red-500' : ''}
                  />
                  {errors.address && <p className="text-xs text-red-500">{errors.address}</p>}
                </div>

                <div className="space-y-3 pt-4">
                  <label className="text-sm font-medium text-gray-700">Phương thức thanh toán</label>
                  <div className="grid grid-cols-1 gap-3">
                    <label
                      className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                        paymentMethod === 'cod' 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cod"
                        checked={paymentMethod === 'cod'}
                        onChange={() => setPaymentMethod('cod')}
                        className="w-4 h-4 text-blue-600"
                      />
                      <Truck className="w-5 h-5 text-gray-600" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Thanh toán khi nhận hàng (COD)</p>
                        <p className="text-xs text-gray-500">Trả tiền mặt khi nhận được hàng</p>
                      </div>
                    </label>
                    <label
                      className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                        paymentMethod === 'stripe' 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="stripe"
                        checked={paymentMethod === 'stripe'}
                        onChange={() => setPaymentMethod('stripe')}
                        className="w-4 h-4 text-blue-600"
                      />
                      <CreditCard className="w-5 h-5 text-gray-600" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Thanh toán qua Stripe</p>
                        <p className="text-xs text-gray-500">Thanh toán an toàn bằng thẻ tín dụng/ghi nợ</p>
                      </div>
                    </label>
                  </div>
                </div>
              </form>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 sticky top-20">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Đơn hàng của bạn</h2>

              <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-3 py-2 border-b border-gray-50 last:border-0"
                  >
                    <div className="h-16 w-16 flex-shrink-0 bg-gray-50 rounded border border-gray-100 p-1">
                      <img
                        src={item.images?.[0] || 'https://placehold.co/100x100?text=No+Image'}
                        alt={item.name}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 line-clamp-2">{item.name}</p>
                      <p className="text-xs text-gray-500">SL: {item.quantity}</p>
                      <p className="text-sm font-bold text-destructive">
                        {item.price.toLocaleString('vi-VN')}₫
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-100">
                <div className="flex justify-between text-gray-600">
                  <span>Tạm tính</span>
                  <span>{total().toLocaleString('vi-VN')}₫</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Phí vận chuyển</span>
                  <span className="font-medium text-gray-900">Miễn phí</span>
                </div>
                <div className="flex justify-between items-center pt-2 text-lg font-bold">
                  <span>Tổng cộng</span>
                  <span className="text-destructive">{total().toLocaleString('vi-VN')}₫</span>
                </div>
              </div>

              <Button
                className="w-full mt-6 h-12 text-lg font-bold bg-destructive hover:bg-destructive/90 text-white uppercase"
                onClick={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                {isLoading 
                  ? 'ĐANG XỬ LÝ...' 
                  : paymentMethod === 'stripe' 
                    ? 'THANH TOÁN QUA STRIPE' 
                    : 'XÁC NHẬN'
                }
              </Button>
              {errors.submit && (
                <p className="text-sm text-red-500 mt-2 text-center">{errors.submit}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={showSuccess} onOpenChange={setShowSuccess}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-4">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <AlertDialogTitle className="text-center text-xl">
              Đặt hàng thành công!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Cảm ơn bạn đã mua hàng. Đơn hàng của bạn đang được xử lý và sẽ sớm được giao đến bạn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction onClick={handleCloseSuccess} className="w-full sm:w-auto px-8">
              Về trang chủ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
