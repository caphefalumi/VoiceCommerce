import { Link, useNavigate } from '@tanstack/react-router';
import { Search, ShoppingCart, LogOut, LogIn, Package } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { CategoryTopNav } from './CategoryTopNav';
import { useCartStore } from '@/store/cart';
import { useAuthStore, fetchCartOnAuth } from '@/store/auth';
import { useState, useRef, useEffect } from 'react';
import { API_BASE } from '@/lib/api';
import type { Product } from '@/types/product';

export function Header() {
  const items = useCartStore((state) => state.items);
  const cartCount = Array.isArray(items) ? items.reduce((acc, item) => acc + item.quantity, 0) : 0;
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [searchSuggestions, setSearchSuggestions] = useState<Product[]>([]);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchSuggestions([]);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/products`);
        if (!res.ok) return;
        const data = (await res.json()) as { products: Product[] } | Product[];
        const products = Array.isArray(data) ? data : (data.products ?? []);
        setAllProducts(products);
      } catch {
        setAllProducts([]);
      }
    };

    loadProducts();
  }, []);

  const normalizeText = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchSuggestions([]);
      return;
    }

    const queryTokens = normalizeText(trimmed).split(' ').filter(Boolean);

    const matched = allProducts
      .filter((product) => {
        const searchableContent = normalizeText(
          [
            product.name,
            product.brand,
            product.description,
            ...Object.values(product.specs || {}),
          ]
            .filter(Boolean)
            .join(' '),
        );

        return queryTokens.every((token) => searchableContent.includes(token));
      })
      .slice(0, 5);

    setSearchSuggestions(matched);
  }, [searchQuery, allProducts]);

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    setSearchSuggestions([]);
    navigate({
      to: '/products',
      search: { search: trimmed, page: 1 } as any,
    });
  };

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
          Thế giới Di động
        </Link>

        <div className="flex-1 max-w-2xl relative" ref={searchRef}>
          <form onSubmit={handleSearchSubmit}>
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Tìm kiếm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white pl-9 border-none h-10 text-black placeholder:text-gray-500 focus-visible:ring-black/20"
            />
          </form>

          {searchQuery.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden z-50">
              {searchSuggestions.length > 0 ? (
                searchSuggestions.map((product) => (
                  <Link
                    key={product.id}
                    to={'/product/$id' as any}
                    params={{ id: product.id } as any}
                    onClick={() => setSearchSuggestions([])}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50"
                  >
                    <img
                      src={product.images?.[0] || 'https://placehold.co/60x60?text=No+Image'}
                      alt={product.name}
                      className="h-10 w-10 rounded border border-gray-100 object-contain"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.brand}</p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-gray-500">Không có gợi ý phù hợp</div>
              )}
            </div>
          )}
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
                      🛠️ Trang Quản Trị
                    </Link>
                  )}
                  <Link
                    to="/orders"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                  >
                    <Package className="w-4 h-4" />
                    Đơn hàng của tôi
                  </Link>
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
      <CategoryTopNav />
    </header>
  );
}
