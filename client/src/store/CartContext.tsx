import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
  subtotal: number
}

interface CartStore {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'subtotal'>) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, delta: number) => void
  clearCart: () => void
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      taxRate: 0.1,

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

          // const newQuantity = item.quantity + delta
          const newQuantity = delta
          if (newQuantity <= 0) {
            return {
              items: state.items.filter((i) => i.productId !== productId),
            }
          }

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

export default useCartStore as any
