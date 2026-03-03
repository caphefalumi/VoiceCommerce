import { Minus, Plus, Trash2 } from "lucide-react"
import { Button } from "../ui/button"
import { useCartStore } from "@/store/cart"
import type { CartItem as CartItemType } from "@/store/cart"

interface CartItemProps {
  item: CartItemType
}

export function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeFromCart } = useCartStore()

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-4 border-b border-gray-100 last:border-0">
      <div className="h-24 w-24 flex-shrink-0 bg-white rounded-md border border-gray-200 p-2 mx-auto sm:mx-0">
        <img
          src={item.images?.[0] ?? '/placeholder-product.png'}
          alt={item.name}
          className="h-full w-full object-contain"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder-product.png'; }}
        />
      </div>
      
      <div className="flex-1 min-w-0 w-full">
        <h3 className="text-base font-semibold text-gray-900 truncate">
          {item.name}
        </h3>
        <p className="text-base font-bold text-destructive mt-1">
          {item.price.toLocaleString('vi-VN')}₫
        </p>
        {item.originalPrice && (
          <p className="text-xs text-gray-500 line-through">
            {item.originalPrice.toLocaleString('vi-VN')}₫
          </p>
        )}
      </div>

      <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-6 mt-2 sm:mt-0">
        <div className="flex items-center border border-gray-300 rounded-md overflow-hidden bg-white">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-none hover:bg-gray-100"
            onClick={() => updateQuantity(item.id, item.quantity - 1)}
            disabled={item.quantity <= 1}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-10 text-center text-sm font-bold">
            {item.quantity}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-none hover:bg-gray-100"
            onClick={() => updateQuantity(item.id, item.quantity + 1)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-gray-400 hover:text-destructive transition-colors"
          onClick={() => removeFromCart(item.id)}
        >
          <Trash2 className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
