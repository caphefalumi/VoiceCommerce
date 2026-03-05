import { Link, useNavigate } from '@tanstack/react-router';
import { Search, ShoppingCart, LogOut, LogIn } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useCartStore } from '@/store/cart';
import { useAuthStore, fetchCartOnAuth } from '@/store/auth';
import { useState, useRef, useEffect } from 'react';

export function Header() {
  const items = useCartStore((state) => state.items);
  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (user) {
      fetchCartOnAuth();
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate({ to: '/' });
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <header className="sticky top-0 z-50 w-full bg-primary text-black shadow-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 gap-4">
        <Link to="/" className="text-xl font-bold tracking-tight whitespace-nowrap">
          The Gioi Di Dong
        </Link>

        <div className="flex-1 max-w-2xl relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Tìm kiếm..."
            className="w-full bg-white pl-9 border-none h-10 text-black placeholder:text-gray-500 focus-visible:ring-black/20"
          />
        </div>

        <div className="hidden md:flex items-center gap-4">
          {user && (
            <Link to="/cart" className="flex items-center gap-2 hover:opacity-80 font-medium">
              <div className="relative">
                <ShoppingCart className="h-6 w-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-destructive text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center border-2 border-primary">
                    {cartCount}
                  </span>
                )}
              </div>
              <span>Giỏ hàng</span>
            </Link>
          )}

          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                id="user-menu-button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 hover:opacity-80 font-medium focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center text-xs font-bold text-black border border-black/20">
                  {initials}
                </div>
                <span className="max-w-[100px] truncate text-sm">{user.name}</span>
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  {(user.role === 'admin' || user.email?.includes('admin')) && (
                    <Link
                      to="/admin"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition"
                    >
                      🛠️ Admin Dashboard
                    </Link>
                  )}
                  <button
                    id="logout-button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-black hover:bg-white/30 flex items-center gap-1"
                >
                  <LogIn className="w-4 h-4" />
                  Đăng nhập
                </Button>
              </Link>
              <Link to="/register">
                <Button
                  size="sm"
                  className="h-8 px-3 bg-white text-primary hover:bg-white/90 font-semibold"
                >
                  Đăng ký
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
