import { CartItem as CartItemType } from '../../../shared/types'
import { useCartStore } from '../store/CartContext'

interface CartItemProps {
  item: CartItemType
}

export default function CartItem({ item }: CartItemProps) {
  const updateQuantity = useCartStore((state) => state.updateQuantity)
  const removeItem = useCartStore((state) => state.removeItem)
  
  return (
    <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200">
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-gray-800 truncate">{item.name}</h4>
        <p className="text-sm text-gray-600">${item.price.toFixed(2)} / 件</p>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="flex items-center bg-white rounded-lg border border-gray-300">
          <button 
            className="px-3 py-2 text-red-600 hover:bg-red-50 font-bold rounded-l-lg"
            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
            disabled={item.quantity <= 1}
          >
            -
          </button>
          <span className="px-3 py-2 font-semibold text-gray-800 min-w-[2rem] text-center">
            {item.quantity}
          </span>
          <button 
            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-r-lg"
            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
          >
            +
          </button>
        </div>
        
        <div className="text-right">
          <p className="font-bold text-gray-800">${(item.price * item.quantity).toFixed(2)}</p>
          <button 
            className="text-sm text-red-600 hover:text-red-800 underline mt-1"
            onClick={() => removeItem(item.productId)}
          >
            移除
          </button>
        </div>
      </div>
    </div>
  )
}
