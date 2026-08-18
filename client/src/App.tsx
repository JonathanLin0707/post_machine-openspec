import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import POS from './pages/POS'
import ProductManagement from './pages/ProductManagement'
import SalesReport from './pages/SalesReport'
import { useCartStore } from './store/CartContext'
import api from './services/api'

function App() {
  const handleCheckout = async (cartItems: any[]) => {
    try {
      console.log('Starting checkout with items:', cartItems)
      
      // Create order in database via API
      const totalAmount = cartItems.reduce((sum, item) => sum + item.subtotal, 0)

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
    } catch (error: any) {
      console.error('Failed to checkout:', error.response?.data || error.message)
      throw error
    }
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<POS onCheckout={handleCheckout} />} />
        <Route path="/orders" element={<POS onCheckout={handleCheckout} />} />
        <Route path="/products" element={<ProductManagement />} />
        <Route path="/reports" element={<SalesReport />} />
      </Routes>
    </Layout>
  )
}

export default App
