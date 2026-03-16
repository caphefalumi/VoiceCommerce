import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ProductCard } from '@/components/ProductCard';
import type { Product } from '@/types/product';
import { API_BASE } from '@/lib/api';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';

const PAGE_SIZE = 24;
const homeSearchSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
});

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>) => homeSearchSchema.parse(search),
  loader: async () => {
    try {
      const res = await fetch(`${API_BASE}/api/products`);
      if (!res.ok) throw new Error('Failed to fetch products');
      const data = (await res.json()) as { products: Product[] } | Product[];
      return Array.isArray(data) ? data : (data.products ?? []);
    } catch (error) {
      console.error('Home loader error:', error);
      return [] as Product[];
    }
  },
  component: HomeComponent,
});

function HomeComponent() {
  const loaderProducts = Route.useLoaderData() as Product[];
  const search = Route.useSearch() as z.infer<typeof homeSearchSchema>;
  const navigate = useNavigate({ from: Route.fullPath });
  const currentPage = Math.max(1, search.page ?? 1);
  const [fallbackProducts, setFallbackProducts] = useState<Product[]>([]);

  useEffect(() => {
    let isMounted = true;
    const needsFallbackFetch = (loaderProducts?.length ?? 0) === 0;
    if (!needsFallbackFetch) {
      setFallbackProducts([]);
      return;
    }

    const loadFallbackProducts = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/products`);
        if (!res.ok) return;
        const data = (await res.json()) as { products: Product[] } | Product[];
        const products = Array.isArray(data) ? data : (data.products ?? []);
        if (isMounted) {
          setFallbackProducts(products);
        }
      } catch {
        if (isMounted) {
          setFallbackProducts([]);
        }
      }
    };

    loadFallbackProducts();
    return () => {
      isMounted = false;
    };
  }, [loaderProducts]);

  const products = loaderProducts.length > 0 ? loaderProducts : fallbackProducts;

  const totalPages = useMemo(() => Math.max(1, Math.ceil(products.length / PAGE_SIZE)), [products.length]);
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const displayedProducts = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return products.slice(start, start + PAGE_SIZE);
  }, [products, safeCurrentPage]);

  const startProductIndex = products.length === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1;
  const endProductIndex = products.length === 0 ? 0 : startProductIndex + displayedProducts.length - 1;

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [safeCurrentPage]);

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
    <div className="container mx-auto px-4 space-y-8 pb-12">
      <div className="pt-4">
        <h1 className="text-2xl font-bold text-gray-800">Bạn muốn mua gì?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hiển thị {startProductIndex}-{endProductIndex} / {products.length} sản phẩm
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() =>
                navigate({
                  search: (old: any) => ({
                    ...old,
                    page: Math.max(1, safeCurrentPage - 1),
                  }),
                } as any)
              }
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
                  onClick={() =>
                    navigate({
                      search: (old: any) => ({
                        ...old,
                        page: item.value,
                      }),
                    } as any)
                  }
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
              onClick={() =>
                navigate({
                  search: (old: any) => ({
                    ...old,
                    page: Math.min(totalPages, safeCurrentPage + 1),
                  }),
                } as any)
              }
              disabled={safeCurrentPage >= totalPages}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sau
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
