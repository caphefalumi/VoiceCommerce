import type { Product } from '@/types/product';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from '@tanstack/react-router';

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const formattedPrice = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(product.price);

  return (
    <Link to={`/product/${product.id}` as any} className={cn('block h-full', className)}>
      <Card className="group h-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-none bg-white">
        <CardContent className="p-0 relative">
          {product.isNew && (
            <Badge className="absolute top-2 left-2 z-10 bg-red-600 hover:bg-red-700">Mới</Badge>
          )}
          <div className="aspect-square overflow-hidden bg-gray-100">
            <img
              src={product.images[0] || 'https://placehold.co/400x400?text=No+Image'}
              alt={product.name}
              className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-start p-4 gap-2">
          <h3 className="font-medium text-sm line-clamp-2 min-h-[2.5rem] group-hover:text-blue-600 transition-colors">
            {product.name}
          </h3>
          <div className="flex items-center gap-1">
            <div className="flex text-yellow-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={12}
                  fill={i < Math.floor(product.rating) ? 'currentColor' : 'none'}
                  className={cn(i < Math.floor(product.rating) ? '' : 'text-gray-300')}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">({product.reviewCount})</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-red-600 font-bold text-lg">{formattedPrice}</span>
            {product.originalPrice && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground line-through">
                  {new Intl.NumberFormat('vi-VN', {
                    style: 'currency',
                    currency: 'VND',
                  }).format(product.originalPrice)}
                </span>
                {product.discountPercentage && (
                  <span className="text-xs text-red-600 bg-red-50 px-1 rounded">
                    -{product.discountPercentage}%
                  </span>
                )}
              </div>
            )}
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
