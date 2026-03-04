import * as React from 'react';
import {
  Smartphone,
  Laptop,
  Tablet,
  Watch,
  Clock,
  Headphones,
  Printer,
  HelpCircle,
} from 'lucide-react';
import { categories } from '@/constants/categories';
import { Link } from '@tanstack/react-router';

const iconMap: Record<string, React.ComponentType<any>> = {
  Smartphone,
  Laptop,
  Tablet,
  Watch,
  Clock,
  Headphones,
  Printer,
};

export function CategoryGrid() {
  return (
    <div className="grid grid-cols-4 md:grid-cols-7 gap-4 py-8">
      {categories.map((category) => {
        const Icon = iconMap[category.icon] || HelpCircle;
        return (
          <Link
            key={category.id}
            to={'/products' as any}
            search={{ category: category.id } as any}
            className="flex flex-col items-center justify-center gap-2 group cursor-pointer"
          >
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center transition-colors group-hover:bg-primary/10">
              <Icon className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <span className="text-sm font-medium text-center group-hover:text-primary transition-colors">
              {category.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
