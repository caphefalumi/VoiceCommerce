import { createFileRoute, notFound } from '@tanstack/react-router';
import type { Product } from '@/types/product';
import { ImageGallery } from '@/components/product/ImageGallery';
import { ProductInfo } from '@/components/product/ProductInfo';
import { TechSpecs } from '@/components/product/TechSpecs';
import { ReviewSection } from '@/components/product/ReviewSection';
import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { API_BASE } from '@/lib/api';

export const Route = createFileRoute('/product/$id' as any)({
  loader: async ({ params }: { params: { id: string } }) => {
    const res = await fetch(`${API_BASE}/api/products/${params.id}`);
    if (res.status === 404) {
      throw notFound();
    }
    if (!res.ok) {
      throw new Error('Failed to fetch product');
    }
    const product = await res.json() as Product;
    return { product };
  },
  component: ProductDetailComponent,
  notFoundComponent: () => (
    <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-4xl font-bold">Product Not Found</h1>
      <p className="text-muted-foreground">The product you are looking for does not exist.</p>
      <Link to="/" className="mt-4">
        <Button>Back to Home</Button>
      </Link>
    </div>
  ),
});

function ProductDetailComponent() {
  const { product } = Route.useLoaderData();

  return (
    <div className="bg-background min-h-screen pb-12">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Products
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <ImageGallery images={product.images} productName={product.name} />
          </div>

          <div className="lg:col-span-5">
            <ProductInfo product={product} />
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="mb-6 border-b pb-2">
              <h2 className="text-2xl font-bold text-foreground">Technical Specifications</h2>
            </div>
            <TechSpecs specs={product.specs} />
            

          </div>

          <div className="lg:col-span-5">
            <div className="mb-6 border-b pb-2">
              <h2 className="text-2xl font-bold text-foreground">Customer Reviews</h2>
            </div>
            <ReviewSection 
              rating={product.rating} 
              reviewCount={product.reviewCount} 
              reviews={product.reviews} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
