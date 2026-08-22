import { useState, useEffect } from 'react'
import ProductCard from '../components/ProductCard'
import CartItem from '../components/CartItem'
import CategoryFilter from '../components/CategoryFilter'
import Toast from '../components/Toast'
import CheckoutConfirmationDialog from '../components/CheckoutConfirmationDialog/CheckoutConfirmationDialog'
import { useCartStore } from '../store/CartContext'
import api from '../services/api'
import { Product, CartItem as CartItemType } from '../../../shared/types'

interface POSProps {
  onCheckout: (cartItems: CartItemType[], paymentMethod: string) => Promise<void>
}

export default function POS({ onCheckout }: POSProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const cart = useCartStore((state) => state.items)

  // Fetch products on mount
  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const response = await api.get('/products')
      setProducts(response.data)
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }

  // Extract unique categories
  const categories = Array.from(new Set(products.map(p => p.category).filter((c): c is string => c !== undefined && c !== null))) as string[]

  // Add product to cart (local state only)
  const handleAddToCart = async (product: Product) => {
    try {
      // Optimistically update local state
      setProducts(products.map(p =>
        p.id === product.id
          ? { ...p, stock: Math.max(0, p.stock - 1) }
          : p
      ))

      // Add to cart store with stock info
      useCartStore.getState().addItem({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1
      })
    } catch (error) {
      console.error('Failed to add to cart:', error)
      // Revert stock change on error
      setProducts(products.map(p =>
        p.id === product.id ? { ...p, stock: p.stock + 1 } : p
      ))
    }
  }

  // Increase quantity with stock check and sync
  const handleIncreaseQuantity = (productId: string) => {
    const item = useCartStore.getState().items.find(i => i.productId === productId)
    const stock = products.find(p =>
      p.id === productId)?.stock || 0

    if (!stock || stock == 0) {
      showToast(`庫存不足：${item?.name} 僅剩 ${stock} 件`)
      return false
    }
    useCartStore.getState().increaseQuantity(productId, stock)

    // Sync product list stock
    setProducts(products.map(p =>
      p.id === productId ? { ...p, stock: Math.max(0, p.stock - 1) } : p
    ))
    return true
  }

  // Clear cart with stock sync
  const handleClearCart = () => {
    const cart = useCartStore.getState()
    const itemsToRemove = [...cart.items]

    setProducts(products.map(p => {
      const itemToRemove = itemsToRemove.find(i => i.productId === p.id)
      if (itemToRemove && itemToRemove.quantity !== undefined) {
        return { ...p, stock: Math.min(p.stock + itemToRemove.quantity, 9999) }
      }
      return p
    }))

    useCartStore.getState().clearCart()
  }

  // Remove item from cart with stock sync
  const handleRemoveItem = (productId: string) => {
    const cart = useCartStore.getState()
    const removedItem = cart.items.find(i => i.productId === productId)

    if (removedItem && removedItem.quantity !== undefined) {
      setProducts(products.map(p =>
        p.id === productId ? { ...p, stock: Math.min(p.stock + removedItem.quantity, 9999) } : p
      ))
    }

    useCartStore.getState().removeItem(productId)
  }

  // Decrease quantity with stock sync
  const handleDecreaseQuantity = (productId: string) => {
    useCartStore.getState().decreaseQuantity(productId)

    // Sync product list stock
    setProducts(products.map(p =>
      p.id === productId ? { ...p, stock: Math.max(0, p.stock + 1) } : p
    ))
  }

  // Show toast notification
  const showToast = (message: string) => {
    setToastMessage(message)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Filter products by search and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchQuery ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !selectedCategory || product.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Calculate cart totals
  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0)
  const total = subtotal

  // Checkout confirmation dialog state
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null)

  // Handle payment method selection
  const handleSelectPaymentMethod = (method: string) => {
    setSelectedPaymentMethod(method)
  }

  // Open confirmation dialog when checkout button is clicked
  const handleOpenConfirmationDialog = () => {
    if (cart.length === 0) {
      showToast('購物車為空，請先加入商品')
      return
    }
    setShowConfirmationDialog(true)
  }

  // Handle confirm checkout
  const handleConfirmCheckout = async (paymentMethod: string) => {
    await onCheckout(cart, paymentMethod)
    setShowConfirmationDialog(false)
    setSelectedPaymentMethod(null)
    showToast('結帳成功！')
  }

  // Handle cancel checkout
  const handleCancelCheckout = () => {
    setShowConfirmationDialog(false)
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Panel - Product List */}
      <div className="w-2/3 flex flex-col">
        {/* Search and Filter Header */}
        <div className="bg-white p-4 shadow-sm border-b">
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              placeholder="搜尋商品名稱或條碼..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none text-lg"
            />
          </div>
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center text-gray-500 text-xl">載入中...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center text-gray-500 text-xl py-10">沒有符合條件的商品</div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={{ ...product, stock: Math.max(0, product.stock) }}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Cart and Checkout */}
      <div className="w-1/3 flex flex-col bg-white border-l">
        {/* Cart Section */}
        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="text-xl font-bold text-gray-800 mb-4 sticky top-0 bg-white pb-2 border-b">
            購物車
          </h2>

          {cart.length === 0 ? (
            <div className="text-center text-gray-500 py-10">
              <p className="text-xl">購物車是空的</p>
              <p className="text-sm mt-2">從左側選擇商品加入購物車</p>
            </div>
          ) : (
            cart.map(item => (
              <CartItem
                key={item.productId}
                item={{ ...item, stock: Math.max(0, item.stock ?? 9999) }}
                onIncrease={(productId) => handleIncreaseQuantity(productId)}
                onDecrease={handleDecreaseQuantity}
                onRemove={handleRemoveItem}
              />
            ))
          )}
        </div>

        {/* Checkout Section */}
        <div className="border-t p-4 bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800 mb-4">結帳</h2>

          <div className="space-y-2 mb-4 text-lg">
            <div className="flex justify-between">
              <span>小計:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-xl pt-2 border-t border-gray-300">
              <span>總計:</span>
              <span className="text-blue-600">${total.toFixed(2)}</span>
            </div>
          </div>

           <div className="space-y-2 mb-4">
             <label className="block text-sm font-semibold text-gray-700">支付方式:</label>
             <div className="grid grid-cols-3 gap-2">
               {['cash', 'credit_card', 'mobile_payment'].map((method) => (
                 <button
                   key={method}
                   onClick={() => handleSelectPaymentMethod(method)}
                   className={`p-3 rounded-lg font-bold text-lg border-2 transition-all ${selectedPaymentMethod === method
                     ? method === 'cash'
                       ? 'bg-green-100 border-green-500 text-green-800'
                       : method === 'credit_card'
                       ? 'bg-blue-100 border-blue-500 text-blue-800'
                       : 'bg-purple-100 border-purple-500 text-purple-800'
                     : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                     }`}
                 >
                   {method === 'cash' ? '現金' : method === 'credit_card' ? '信用卡' : '行動支付'}
                 </button>
               ))}
             </div>
           </div>

           <button
             className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg text-xl shadow-lg active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
             onClick={handleOpenConfirmationDialog}
             disabled={cart.length === 0}
           >
             結帳
           </button>

          <button
            className="w-full bg-gray-400 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg text-lg shadow-md active:scale-95 transition-transform mt-2"
            onClick={handleClearCart}
          >
            清空購物車
          </button>

        </div>
      </div>

       {/* Toast Notification */}
       {toastMessage && (
         <Toast message={toastMessage} type="error" onClose={() => setToastMessage(null)} />
       )}

       {/* Checkout Confirmation Dialog */}
       {showConfirmationDialog && (
         <CheckoutConfirmationDialog
           cartItems={cart}
           subtotal={subtotal}
           total={total}
           paymentMethod={selectedPaymentMethod}
           onConfirm={() => handleConfirmCheckout(selectedPaymentMethod || 'cash')}
           onCancel={handleCancelCheckout}
         />
       )}
     </div>
   )
 }
