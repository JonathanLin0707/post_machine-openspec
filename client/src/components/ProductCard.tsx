import { Product } from '../../../shared/types'

interface ProductCardProps {
  product: Product
  onAddToCart: (product: Product) => void
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer border-2 border-gray-100 hover:border-blue-500" onClick={() => onAddToCart(product)}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-800 truncate">{product.name}</h3>
          {product.barcode && (
            <p className="text-sm text-gray-500 mt-1">📱 {product.barcode}</p>
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
        <span className="text-sm text-gray-600">库存：{product.stock} 件</span>
        <button 
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg text-lg shadow-md active:scale-95 transition-transform"
          onClick={(e) => {
            e.stopPropagation()
            onAddToCart(product)
          }}
        >
          + 加入購物車
        </button>
      </div>
    </div>
  )
}
