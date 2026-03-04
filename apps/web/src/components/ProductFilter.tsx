import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Filter } from 'lucide-react';
import type { FilterOptions } from '@/lib/filter';
import { cn } from '@/lib/utils';

interface ProductFilterProps {
  filters: FilterOptions;
  brands: string[];
  onFilterChange: (filters: FilterOptions) => void;
}

export function ProductFilter({ filters, brands, onFilterChange }: ProductFilterProps) {
  const handleBrandToggle = (brand: string) => {
    const currentBrands = filters.brand || [];
    const newBrands = currentBrands.includes(brand)
      ? currentBrands.filter((b) => b !== brand)
      : [...currentBrands, brand];

    onFilterChange({ ...filters, brand: newBrands });
  };

  const handlePriceChange = (type: 'minPrice' | 'maxPrice', value: string) => {
    const numValue = value === '' ? undefined : parseInt(value);
    onFilterChange({ ...filters, [type]: numValue });
  };

  const clearFilters = () => {
    onFilterChange({ category: filters.category });
  };

  return (
    <div className="flex flex-col gap-6 p-4 bg-white rounded-xl shadow-sm border border-gray-100 h-fit sticky top-20">
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Filter size={20} className="text-blue-600" />
          <span>Bộ lọc</span>
        </div>
        {(filters.brand?.length || filters.minPrice || filters.maxPrice) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-xs text-blue-600 hover:text-blue-700 h-auto p-0"
          >
            Xóa tất cả
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h4 className="font-semibold text-sm uppercase tracking-wider text-gray-500">
          Thương hiệu
        </h4>
        <div className="flex flex-col gap-2">
          {brands.map((brand) => (
            <label key={brand} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.brand?.includes(brand) || false}
                onChange={() => handleBrandToggle(brand)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-sm text-gray-700 group-hover:text-blue-600 transition-colors">
                {brand}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h4 className="font-semibold text-sm uppercase tracking-wider text-gray-500">
          Khoảng giá (VND)
        </h4>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-gray-400 font-medium">Từ</span>
              <Input
                type="number"
                placeholder="0"
                value={filters.minPrice ?? ''}
                onChange={(e) => handlePriceChange('minPrice', e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-gray-400 font-medium">Đến</span>
              <Input
                type="number"
                placeholder="Đến"
                value={filters.maxPrice ?? ''}
                onChange={(e) => handlePriceChange('maxPrice', e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {[
              { label: 'Dưới 5tr', min: 0, max: 5000000 },
              { label: '5tr - 15tr', min: 5000000, max: 15000000 },
              { label: 'Trên 15tr', min: 15000000, max: undefined },
            ].map((range) => (
              <Button
                key={range.label}
                variant="outline"
                size="sm"
                onClick={() =>
                  onFilterChange({ ...filters, minPrice: range.min, maxPrice: range.max })
                }
                className={cn(
                  'text-[10px] h-7 px-2 rounded-full',
                  filters.minPrice === range.min && filters.maxPrice === range.max
                    ? 'bg-blue-50 border-blue-200 text-blue-600'
                    : 'text-gray-500',
                )}
              >
                {range.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
