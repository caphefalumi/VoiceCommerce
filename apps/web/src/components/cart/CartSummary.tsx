import { Button } from '../ui/button';
import { useCartStore } from '@/store/cart';
import { Link } from '@tanstack/react-router';

export function CartSummary() {
  const { items, total } = useCartStore();
  const totalPrice = total() || 0;
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 sticky top-20">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Tóm tắt đơn hàng</h2>

      <div className="space-y-4 mb-6">
        <div className="flex justify-between text-gray-600">
          <span>Tạm tính ({itemCount} sản phẩm)</span>
          <span>{totalPrice.toLocaleString('vi-VN')}₫</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Giảm giá</span>
          <span className="text-green-600">0₫</span>
        </div>
        <div className="flex justify-between text-gray-600 pb-4 border-b border-gray-100">
          <span>Phí vận chuyển</span>
          <span className="text-gray-900 font-medium">Miễn phí</span>
        </div>
        <div className="flex justify-between items-center pt-2">
          <span className="text-lg font-bold text-gray-900">Tổng cộng</span>
          <span className="text-2xl font-bold text-destructive">
            {totalPrice.toLocaleString('vi-VN')}₫
          </span>
        </div>
      </div>

      <Link to="/checkout">
        <Button className="w-full h-12 text-lg font-bold bg-destructive hover:bg-destructive/90 text-white uppercase">
          Tiến hành đặt hàng
        </Button>
      </Link>

      <p className="text-xs text-gray-500 text-center mt-4 italic">
        (Vui lòng kiểm tra lại giỏ hàng trước khi đặt hàng)
      </p>
    </div>
  );
}
