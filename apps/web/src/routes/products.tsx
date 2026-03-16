import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import { filterProducts } from '@/lib/filter';
import type { FilterOptions } from '@/lib/filter';
import type { Product } from '@/types/product';
import { ProductCard } from '@/components/ProductCard';
import { ProductFilter } from '@/components/ProductFilter';
import { useEffect, useMemo } from 'react';
import { API_BASE } from '@/lib/api';

const productsSearchSchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  brand: z.array(z.string()).optional(),
  page: z.coerce.number().int().min(1).optional(),
});

const PAGE_SIZE = 24;

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
  const currentPage = Math.max(1, search.page ?? 1);

  const filteredProducts = useMemo(() => {
    return filterProducts(products, search);
  }, [search, products]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  }, [filteredProducts.length]);

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const displayedProducts = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, safeCurrentPage]);

  const startProductIndex = filteredProducts.length === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1;
  const endProductIndex = filteredProducts.length === 0 ? 0 : startProductIndex + displayedProducts.length - 1;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [safeCurrentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      navigate({
        search: (old: any) => ({
          ...old,
          page: totalPages,
        }),
      } as any);
    }
  }, [currentPage, totalPages, navigate]);

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
        page: 1,
      }),
    } as any);
  };

  const goToPage = (page: number) => {
    const nextPage = Math.min(Math.max(1, page), totalPages);
    navigate({
      search: (old: any) => ({
        ...old,
        page: nextPage,
      }),
    } as any);
  };

  const pageItems = useMemo(() => {
    const pages = new Set<number>([1, totalPages]);

    for (let page = safeCurrentPage - 2; page <= safeCurrentPage + 2; page += 1) {
      if (page >= 1 && page <= totalPages) {
        pages.add(page);
      }
    }

    const sortedPages = Array.from(pages).sort((a, b) => a - b);
    const items: Array<
      { type: 'page'; value: number } | { type: 'ellipsis'; key: string }
    > = [];

    sortedPages.forEach((page, index) => {
      if (index > 0 && page - sortedPages[index - 1] > 1) {
        items.push({
          type: 'ellipsis',
          key: `ellipsis-${sortedPages[index - 1]}-${page}`,
        });
      }

      items.push({ type: 'page', value: page });
    });

    return items;
  }, [safeCurrentPage, totalPages]);

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
                (Hiển thị {startProductIndex}-{endProductIndex} / {filteredProducts.length} sản phẩm)
              </span>
            </h1>
          </div>

          {displayedProducts.length > 0 ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {displayedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() => goToPage(safeCurrentPage - 1)}
                    disabled={safeCurrentPage <= 1}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Trước
                  </button>

                  {pageItems.map((item) =>
                    item.type === 'ellipsis' ? (
                      <span
                        key={item.key}
                        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-400"
                      >
                        ...
                      </span>
                    ) : (
                      <button
                        key={item.value}
                        onClick={() => goToPage(item.value)}
                        className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                          item.value === safeCurrentPage
                            ? 'border-primary bg-primary text-black'
                            : 'border-gray-300 bg-white text-gray-700'
                        }`}
                      >
                        {item.value}
                      </button>
                    ),
                  )}

                  <button
                    onClick={() => goToPage(safeCurrentPage + 1)}
                    disabled={safeCurrentPage >= totalPages}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Sau
                  </button>
                </div>
              )}
            </>
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
