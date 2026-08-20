import { Product } from '../../../shared/types'

interface ProductCardProps {
  product: Product & { stock?: number }
  onAddToCart: (product: Product) => void
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const isLowStock = product.stock !== undefined && product.stock <= 0
  
  return (
    <div className={`rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer border-2 ${
      isLowStock ? 'border-red-300' : 'border-gray-100 hover:border-blue-500'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-800 truncate">{product.name}</h3>
          {product.barcode && (
            <p className={`text-sm mt-1 ${isLowStock ? 'text-red-600' : 'text-gray-500'}`}>📱 {product.barcode}</p>
          )}
        </div>
        <span className="ml-3 bg-green-100 text-green-800 px-3 py-1 rounded-full font-bold text-lg">
          ${product.price.toFixed(2)}
        </span>
      </div>
      
      {product.category && (
        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mb-2">
          {product.category}
        </span>
      )}
      
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
        <span className={`text-sm ${isLowStock ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
          庫存：{product.stock} 件
          {isLowStock && <span className="ml-2 text-xs">(補貨中)</span>}
        </span>
        <button 
          className={`font-bold py-3 px-4 rounded-lg text-lg shadow-md active:scale-95 transition-transform ${
            isLowStock 
              ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
          onClick={(e) => {
            e.stopPropagation()
            onAddToCart(product)
          }}
          disabled={isLowStock}
        >
          + 加入購物車
        </button>
      </div>
    </div>
  )
}
