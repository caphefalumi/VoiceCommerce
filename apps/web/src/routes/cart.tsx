import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { useCartStore } from '@/store/cart';
import { useAuthStore } from '@/store/auth';
import { CartItem } from '@/components/cart/CartItem';
import { CartSummary } from '@/components/cart/CartSummary';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { authClient } from '@/lib/auth-client';

export const Route = createFileRoute('/cart')({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session?.data?.user) throw redirect({ to: '/login', search: { redirect: '/cart' } });
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) {
      const u = session.data.user;
      useAuthStore.getState()._setUser({
        id: u.id,
        email: u.email,
        name: u.name ?? '',
        role: (u as { role?: string }).role ?? 'user',
      });
    }
  },
  component: CartPage,
});

function CartPage() {
  const items = useCartStore((state) => state.items);

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="bg-gray-100 rounded-full p-8 mb-6">
          <ShoppingBag className="h-16 w-16 text-gray-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Giỏ hàng đang trống</h1>
        <p className="text-gray-500 mb-8 text-center max-w-md">
          Chưa có sản phẩm nào trong giỏ hàng của bạn. Hãy dạo quanh và chọn cho mình những sản phẩm
          ưng ý nhé!
        </p>
        <Link to="/">
          <Button className="bg-primary text-black font-bold h-12 px-8 hover:bg-primary/90 uppercase tracking-wide">
            Tiếp tục mua sắm
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#f3f3f3] min-h-screen pb-20">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/">
            <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-white rounded-full">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-gray-900 uppercase">
            Giỏ hàng của bạn ({items.length})
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
              <div className="flex flex-col">
                {items.map((item) => (
                  <CartItem key={item.id} item={item} />
                ))}
              </div>
            </div>

            <Link
              to="/"
              className="inline-flex items-center text-sm font-medium text-blue-600 hover:underline gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Tiếp tục mua sắm
            </Link>
          </div>

          <div className="lg:col-span-1">
            <CartSummary />
          </div>
        </div>
      </div>
    </div>
  );
}
