import { createFileRoute } from '@tanstack/react-router';
import { CategoryGrid } from '@/components/CategoryGrid';
import { ProductCard } from '@/components/ProductCard';
import type { Product } from '@/types/product';
import { API_BASE } from '@/lib/api';

export const Route = createFileRoute('/')({
  loader: async () => {
    try {
      const res = await fetch(`${API_BASE}/api/products`);
      if (!res.ok) throw new Error('Failed to fetch products');
      const data = (await res.json()) as { products: Product[] } | Product[];
      return Array.isArray(data) ? data : (data.products ?? []);
    } catch (error) {
      console.error(error);
      return [] as Product[];
    }
  },
  component: HomeComponent,
});

function HomeComponent() {
  const products = Route.useLoaderData() as Product[];

  return (
    <div className="container mx-auto px-4 space-y-8 pb-12">
      <div className="pt-4">
        <h1 className="text-2xl font-bold text-gray-800">Chào mừng</h1>
      </div>
      <CategoryGrid />

      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}
