import * as React from 'react';
import { Link } from '@tanstack/react-router';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Product } from '@/types/product';

function CountdownTimer() {
  const [timeLeft, setTimeLeft] = React.useState(0);

  React.useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const nextResetHour = currentHour + (2 - (currentHour % 2));
      const nextReset = new Date(now);
      nextReset.setHours(nextResetHour, 0, 0, 0);

      const diff = nextReset.getTime() - now.getTime();
      return Math.floor(diff / 1000);
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
      .toString()
      .padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60)
      .toString()
      .padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold uppercase hidden sm:inline-block">Ending in:</span>
      <div className="flex items-center gap-1 font-mono font-bold text-lg bg-black/10 px-2 py-1 rounded">
        {formatTime(timeLeft)}
      </div>
    </div>
  );
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

interface FlashSaleProps {
  products: Product[];
}

export function FlashSale({ products }: FlashSaleProps) {
  const flashSaleProducts = products.filter((p) => p.isFlashSale);

  if (flashSaleProducts.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-orange-400 to-red-500 rounded-xl p-4 md:p-6 my-8 text-white shadow-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-2 drop-shadow-md">
            <span className="animate-bounce">⚡</span> Flash Sale
          </h2>
          <Badge variant="secondary" className="bg-white text-red-600 hover:bg-white/90 font-bold">
            HOT
          </Badge>
        </div>
        <CountdownTimer />
      </div>

      <Carousel
        opts={{
          align: 'start',
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {flashSaleProducts.map((product) => (
            <CarouselItem
              key={product.id}
              className="pl-2 md:pl-4 basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5"
            >
              <div className="p-1 h-full">
                <Link to={'/product/' + product.id} className="block h-full">
                  <Card className="h-full border-0 shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden group bg-white text-foreground">
                    <CardContent className="p-0 flex flex-col h-full relative">
                      <div className="absolute top-2 left-2 z-10">
                        <Badge variant="destructive" className="font-bold">
                          -{product.discountPercentage}%
                        </Badge>
                      </div>
                      <div className="aspect-square p-4 bg-white flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                        <img
                          src={product.images[0] || 'https://placehold.co/400x400?text=No+Image'}
                          alt={product.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="p-4 flex-1 flex flex-col gap-2">
                        <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors h-[40px]">
                          {product.name}
                        </h3>
                        <div className="mt-auto">
                          <div className="text-lg font-bold text-red-600">
                            {formatCurrency(product.price)}
                          </div>
                          <div className="text-xs text-muted-foreground line-through">
                            {formatCurrency(product.originalPrice || product.price)}
                          </div>
                          <div className="mt-2 text-xs text-orange-500 font-medium flex items-center gap-1">
                            🔥 {product.stock} items left
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-0 bg-white/80 hover:bg-white text-black border-none" />
        <CarouselNext className="right-0 bg-white/80 hover:bg-white text-black border-none" />
      </Carousel>
    </div>
  );
}
