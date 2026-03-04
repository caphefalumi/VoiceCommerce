import { Link } from '@tanstack/react-router';
import { Home, LayoutGrid, ShoppingCart, User } from 'lucide-react';
import { useAuthStore } from '@/store/auth';

export function BottomNav() {
  const { user } = useAuthStore();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-1 md:hidden z-50 shadow-[0_-1px_3px_rgba(0,0,0,0.1)]">
      <div className="grid grid-cols-4 h-14">
        <Link
          to="/"
          className="flex flex-col items-center justify-center text-gray-500 hover:text-primary active:text-primary transition-colors [&.active]:text-primary"
        >
          <Home className="h-6 w-6 mb-1" />
          <span className="text-[10px] font-medium">Trang chủ</span>
        </Link>
        <Link
          to={'/products' as any}
          className="flex flex-col items-center justify-center text-gray-500 hover:text-primary active:text-primary transition-colors [&.active]:text-primary"
        >
          <LayoutGrid className="h-6 w-6 mb-1" />
          <span className="text-[10px] font-medium">Danh mục</span>
        </Link>
        {user ? (
          <Link
            to="/cart"
            className="flex flex-col items-center justify-center text-gray-500 hover:text-primary active:text-primary transition-colors [&.active]:text-primary"
          >
            <ShoppingCart className="h-6 w-6 mb-1" />
            <span className="text-[10px] font-medium">Giỏ hàng</span>
          </Link>
        ) : (
          <Link
            to="/login"
            search={{ redirect: '/cart' }}
            className="flex flex-col items-center justify-center text-gray-500 hover:text-primary active:text-primary transition-colors"
          >
            <ShoppingCart className="h-6 w-6 mb-1" />
            <span className="text-[10px] font-medium">Giỏ hàng</span>
          </Link>
        )}
        <Link
          to="/"
          className="flex flex-col items-center justify-center text-gray-500 hover:text-primary active:text-primary transition-colors"
        >
          <User className="h-6 w-6 mb-1" />
          <span className="text-[10px] font-medium">Tài khoản</span>
        </Link>
      </div>
    </div>
  );
}
