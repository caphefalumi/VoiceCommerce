import { createFileRoute } from '@tanstack/react-router'
import { CategoryGrid } from '@/components/CategoryGrid'
import { ProductCard } from '@/components/ProductCard'
import { useTranslation } from 'react-i18next'
import type { Product } from '@/types/product'
import { API_BASE } from '@/lib/api'

export const Route = createFileRoute('/')({
  loader: async () => {
    try {
      const res = await fetch(`${API_BASE}/api/products`)
      if (!res.ok) throw new Error('Failed to fetch products')
      return await res.json() as Product[]
    } catch (error) {
      console.error(error)
      return [] as Product[]
    }
  },
  component: HomeComponent,
})

function HomeComponent() {
  const { t } = useTranslation()
  const products = Route.useLoaderData() as Product[]

  return (
    <div className="container mx-auto px-4 space-y-8 pb-12">
      <div className="pt-4">
        <h1 className="text-2xl font-bold text-gray-800">{t('welcome')}</h1>
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
  )
}
