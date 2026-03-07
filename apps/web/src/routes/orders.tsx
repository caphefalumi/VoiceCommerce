import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { useAuthStore } from '@/store/auth';
import { API_BASE } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Package, Clock, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  status: string;
  status_text: string;
  total_price: number;
  items: OrderItem[];
  created_at: string;
  short_id: string;
}

export const Route = createFileRoute('/orders')({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session?.data?.user) throw redirect({ to: '/login', search: { redirect: '/orders' } });
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
  component: OrdersPage,
});

function OrdersPage() {
  const user = useAuthStore((state) => state.user);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      if (!user?.id) return;
      try {
        const res = await fetch(`${API_BASE}/api/orders/${user.id}`);
        const data = await res.json();
        if (data.orders) {
          setOrders(data.orders);
        }
      } catch (err) {
        console.error('Failed to fetch orders:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, [user?.id]);

  const getStatusIcon = (status: string) => {
    if (status === 'delivered') return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (status === 'shipped' || status === 'preparing') return <Clock className="h-5 w-5 text-yellow-500" />;
    return <Package className="h-5 w-5 text-gray-500" />;
  };

  const getStatusColor = (status: string) => {
    if (status === 'delivered') return 'bg-green-100 text-green-800';
    if (status === 'shipped') return 'bg-blue-100 text-blue-800';
    if (status === 'preparing') return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-[#f3f3f3] min-h-screen pb-20">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-6">
            <Link to="/">
              <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-white rounded-full">
                <ArrowLeft className="h-6 w-6" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-gray-900 uppercase">Đơn hàng của tôi</h1>
          </div>
          <div className="bg-white rounded-lg p-8 text-center">
            <div className="bg-gray-100 rounded-full p-8 mb-6 mx-auto w-fit">
              <Package className="h-16 w-16 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Chưa có đơn hàng nào</h2>
            <p className="text-gray-500 mb-6">Hãy mua sản phẩm đầu tiên của bạn tại TGDD nhé!</p>
            <Link to="/">
              <Button className="bg-primary text-black font-bold h-12 px-8 hover:bg-primary/90 uppercase tracking-wide">
                Mua sắm ngay
              </Button>
            </Link>
          </div>
        </div>
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
          <h1 className="text-xl font-bold text-gray-900 uppercase">Đơn hàng của tôi</h1>
        </div>

        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="font-bold text-lg">#{order.short_id}</span>
                  <span className="text-gray-500 text-sm ml-2">{formatDate(order.created_at)}</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${getStatusColor(order.status)}`}>
                  {getStatusIcon(order.status)}
                  {order.status_text}
                </span>
              </div>
              
              <div className="border-t pt-3">
                {order.items.slice(0, 2).map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm py-1">
                    <span className="text-gray-600">{item.name} x{item.quantity}</span>
                    <span className="font-medium">{(item.price * item.quantity).toLocaleString('vi-VN')} VND</span>
                  </div>
                ))}
                {order.items.length > 2 && (
                  <div className="text-sm text-gray-500 py-1">
                    +{order.items.length - 2} sản phẩm khác
                  </div>
                )}
              </div>
              
              <div className="border-t mt-3 pt-3 flex justify-between items-center">
                <span className="text-gray-600 text-sm">Tổng cộng:</span>
                <span className="font-bold text-lg text-primary">{order.total_price.toLocaleString('vi-VN')} VND</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
