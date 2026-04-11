import type { Product } from '@/types/product';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Truck, ShieldCheck, RefreshCcw, ShoppingCart, Check } from 'lucide-react';
import { useCartStore } from '@/store/cart';
import { useAuthStore } from '@/store/auth';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { useState } from 'react';

interface ProductInfoProps {
  product: Product;
}

export function ProductInfo({ product }: ProductInfoProps) {
  const { addToCart } = useCartStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdded, setIsAdded] = useState(false);

  const formatter = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  });
  const discountPercentage = Number(product.discountPercentage ?? 0);
  const hasDiscount = discountPercentage > 0;
  const showOriginalPrice = hasDiscount && typeof product.originalPrice === 'number';

  const handleBuyNow = () => {
    if (!user) {
      navigate({ to: '/login', search: { redirect: location.pathname, error: '' } });
      return;
    }
    addToCart(product);
    navigate({ to: '/cart' });
  };

  const handleAddToCart = () => {
    if (!user) {
      navigate({ to: '/login', search: { redirect: location.pathname, error: '' } });
      return;
    }
    addToCart(product);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-2 flex items-center gap-2">
          {product.isNew && <Badge variant="secondary">Mới về</Badge>}
          {product.stock < 10 && <Badge variant="outline">Sắp hết hàng</Badge>}
        </div>

        <h1 className="text-3xl font-bold text-foreground">{product.name}</h1>

        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex items-center text-yellow-500">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${i < Math.floor(product.rating) ? 'fill-current' : 'opacity-30'}`}
              />
            ))}
          </div>
          <span>({product.reviewCount} đánh giá)</span>
          <span>•</span>
          <span className="font-medium text-foreground">{product.brand}</span>
        </div>
      </div>

      <div className="rounded-lg bg-muted/30 p-4">
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold text-red-600">{formatter.format(product.price)}</span>
          {showOriginalPrice && (
            <span className="text-lg text-muted-foreground line-through">
              {formatter.format(product.originalPrice as number)}
            </span>
          )}
          {hasDiscount && (
            <Badge variant="destructive">-{discountPercentage}%</Badge>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          {Object.entries(product.specs || {})
            .slice(0, 4)
            .map(([key, value]) => (
              <div key={key} className="flex justify-between border-b pb-1">
                <span className="text-muted-foreground">{key}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              size="lg"
              className="w-full text-lg font-bold bg-destructive hover:bg-destructive/90 text-white"
              onClick={handleBuyNow}
            >
              MUA NGAY
            </Button>
            <Button
              variant="outline"
              size="lg"
              className={`w-full text-lg font-bold border-primary hover:bg-primary/10 transition-all duration-300 ${
                isAdded
                  ? 'bg-green-50 text-green-600 border-green-600 hover:bg-green-100 hover:text-green-700'
                  : 'text-black'
              }`}
              onClick={handleAddToCart}
              disabled={product.stock === 0}
            >
              {isAdded ? (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  ĐÃ THÊM VÀO GIỎ
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  THÊM GIỎ HÀNG
                </>
              )}
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Giao hàng miễn phí dành riêng cho bạn hôm nay
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-lg border p-4 text-sm sm:grid-cols-3">
        <div className="flex flex-col items-center gap-2 text-center">
          <Truck className="h-6 w-6 text-primary" />
          <span className="font-medium">Miễn phí giao hàng</span>
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <span className="font-medium">Bảo hành 1 năm</span>
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <RefreshCcw className="h-6 w-6 text-primary" />
          <span className="font-medium">30 ngày đổi trả</span>
        </div>
      </div>
    </div>
  );
}
