import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem as SharedCartItem } from 'shared'

// 購物車列：shared CartItem 為單一來源，此處僅加庫存上限用的 stock。
interface CartItem extends SharedCartItem {
  stock?: number
}

interface CartStore {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'subtotal'>) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, delta: number) => void
  increaseQuantity: (productId: string, stock?: number) => boolean
  decreaseQuantity: (productId: string) => void
  clearCart: () => void
  getState: () => { items: CartItem[] }
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        set((state) => {
          const existingItem = state.items.find((i) => i.productId === item.productId)
          if (existingItem) {
            const newQuantity = existingItem.quantity + 1
            return {
              items: state.items.map((i) =>
                i.productId === item.productId
                  ? { ...i, quantity: newQuantity, subtotal: i.price * newQuantity }
                  : i
              ),
            }
          }
          return {
            items: [...state.items, { ...item, quantity: 1, subtotal: item.price }],
          }
        })
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        }))
      },

      updateQuantity: (productId, delta) => {
        set((state) => {
          const item = state.items.find((i) => i.productId === productId)
          if (!item) return state

          const newQuantity = delta
          // const newQuantity = item.quantity + delta
          return {
            items: state.items.map((i) =>
              i.productId === productId
                ? { ...i, quantity: newQuantity, subtotal: i.price * newQuantity }
                : i
            ),
          }
        })
      },

      increaseQuantity: (productId, stock?): boolean => {
        const item = get().items.find((i) => i.productId === productId)
        if (!item) return false

        stock = stock ?? item.stock

        // Check if adding 1 more exceeds stock
        if (stock !== undefined && item.quantity + 1 > stock) {
          return false
        }

        set((state) => {
          const newQuantity = item.quantity + 1
          return {
            items: state.items.map((i) =>
              i.productId === productId
                ? {
                  ...i,
                  quantity: newQuantity,
                  subtotal: i.price * newQuantity,
                }
                : i
            ),
          }
        })
        return true
      },

      decreaseQuantity: (productId) => {
        set((state) => {
          const item = state.items.find((i) => i.productId === productId)
          if (!item || item.quantity <= 1) return state

          const newQuantity = item.quantity - 1
          // Increase stock when decreasing cart quantity
          return {
            items: state.items.map((i) =>
              i.productId === productId
                ? { ...i, quantity: newQuantity, subtotal: i.price * newQuantity }
                : i
            ),
          }
        })
      },

      clearCart: () => set({ items: [] }),

      getState: () => get(),
    }),
    {
      name: 'cart-storage',
    }
  )
)

export default useCartStore
