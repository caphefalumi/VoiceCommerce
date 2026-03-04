import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import { filterProducts } from '@/lib/filter';
import type { FilterOptions } from '@/lib/filter';
import type { Product } from '@/types/product';
import { ProductCard } from '@/components/ProductCard';
import { ProductFilter } from '@/components/ProductFilter';
import { useMemo } from 'react';
import { API_BASE } from '@/lib/api';

const productsSearchSchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  brand: z.array(z.string()).optional(),
});

export const Route = createFileRoute('/products' as any)({
  validateSearch: (search: Record<string, unknown>) => productsSearchSchema.parse(search),
  loaderDeps: ({ search: { category, search, minPrice, maxPrice } }) => ({
    category,
    search,
    minPrice,
    maxPrice,
  }),
  loader: async ({ deps: { category, search, minPrice, maxPrice } }) => {
    try {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (search) params.append('search', search);
      if (minPrice !== undefined) params.append('minPrice', minPrice.toString());
      if (maxPrice !== undefined) params.append('maxPrice', maxPrice.toString());

      const res = await fetch(`${API_BASE}/api/products?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch products');
      }
      const data = (await res.json()) as { products: Product[] } | Product[];
      return Array.isArray(data) ? data : (data.products ?? []);
    } catch (error) {
      console.error('Loader error:', error);
      return [] as Product[];
    }
  },
  component: ProductsComponent,
});

function ProductsComponent() {
  const search = Route.useSearch() as z.infer<typeof productsSearchSchema>;
  const products = Route.useLoaderData() as Product[];
  const navigate = useNavigate({ from: Route.fullPath });

  const filteredProducts = useMemo(() => {
    return filterProducts(products, search);
  }, [search, products]);

  const uniqueBrands = useMemo(() => {
    const brands = new Set<string>();
    products.forEach((p) => {
      if (search.category) {
        if (p.category === search.category) {
          brands.add(p.brand);
        }
      } else {
        brands.add(p.brand);
      }
    });
    return Array.from(brands).sort();
  }, [products, search.category]);

  const handleFilterChange = (newFilters: FilterOptions) => {
    navigate({
      search: (old: any) => ({
        ...old,
        ...newFilters,
      }),
    } as any);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-64 flex-shrink-0">
          <ProductFilter
            filters={search}
            brands={uniqueBrands}
            onFilterChange={handleFilterChange}
          />
        </aside>

        <div className="flex-1">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold">
              {search.category
                ? `${search.category.charAt(0).toUpperCase() + search.category.slice(1)}`
                : 'Tất cả sản phẩm'}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({filteredProducts.length} sản phẩm)
              </span>
            </h1>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed">
              <p className="text-muted-foreground">Không tìm thấy sản phẩm nào khớp với bộ lọc.</p>
              <button
                onClick={() => handleFilterChange({ category: search.category })}
                className="mt-4 text-blue-600 font-medium hover:underline"
              >
                Xóa tất cả bộ lọc
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
