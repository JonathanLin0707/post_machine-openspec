import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import POS from './pages/POS'
import ProductManagement from './pages/ProductManagement'
import SalesReport from './pages/SalesReport'
import Orders from './pages/Orders'
import { useCartStore } from './store/CartContext'
import api from './services/api'
import { CartItem } from 'shared'

function App() {
  const handleCheckout = async (cartItems: CartItem[]) => {
    try {
      console.log('Starting checkout with items:', cartItems)
      
      // Create order - send items with product_id (server calculates total and tax)
      await api.post('/orders', {
        items: cartItems.map(item => ({
          productId: String(item.productId),
          quantity: item.quantity
        })),
        payment_method: 'cash'
      })

      console.log('Order created successfully')

      // Clear cart using Zustand store
      useCartStore.getState().clearCart()

      console.log('Checkout successful')
    } catch (error) {
      console.error('Failed to checkout:', error)
      throw error
    }
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<POS onCheckout={handleCheckout} />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/products" element={<ProductManagement />} />
        <Route path="/reports" element={<SalesReport />} />
      </Routes>
    </Layout>
  )
}

export default App
