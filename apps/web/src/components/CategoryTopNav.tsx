import * as React from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { categories } from '@/constants/categories';
import { House, Smartphone, Laptop, Tablet, Watch, Clock, Headphones, Printer, HelpCircle } from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Smartphone,
  Laptop,
  Tablet,
  Watch,
  Clock,
  Headphones,
  Printer,
};

export function CategoryTopNav() {
  const location = useRouterState({ select: (s) => s.location });
  const activeCategory = (location.search as Record<string, unknown>)?.category;

  return (
    <nav className="w-full border-t border-black/10 bg-primary text-black">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-5 overflow-x-auto py-2">
          <Link
            to="/"
            className="flex items-center gap-2 whitespace-nowrap text-lg font-medium transition-opacity hover:opacity-80"
          >
            <House className="h-5 w-5" />
            <span>Trang Chủ</span>
          </Link>

          {categories.map((category) => (
            <Link
              key={category.id}
              to="/products"
              search={{ category: category.id }}
              className={`flex items-center gap-2 whitespace-nowrap text-lg font-medium transition-opacity hover:opacity-80 ${
                location.pathname === '/products' && activeCategory === category.id
                  ? 'opacity-100'
                  : 'opacity-85'
              }`}
            >
              {(() => {
                const Icon = iconMap[category.icon] || HelpCircle;
                return <Icon className="h-5 w-5" />;
              })()}
              {category.name}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
