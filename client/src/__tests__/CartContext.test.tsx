import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCartStore } from '../store/CartContext'

describe('CartContext (useCartStore)', () => {
  it('should initialize with empty cart', () => {
    const { result } = renderHook(() => useCartStore())

    expect(result.current.items).toEqual([])
  })

  it('should add item to cart', () => {
    const { result } = renderHook(() => useCartStore())

    act(() => {
      result.current.addItem({
        productId: '1',
        name: 'Test Product',
        price: 10,
        quantity: 0
      })
    })

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].quantity).toBe(1)
    expect(result.current.items[0].subtotal).toBe(10)
  })

  it('should update item quantity', () => {
    const { result } = renderHook(() => useCartStore())

    act(() => {
      result.current.addItem({
        productId: '1',
        name: 'Test Product',
        price: 10,
        quantity: 0
      })
    })

    act(() => {
      result.current.updateQuantity('1', 3)
    })

    expect(result.current.items[0].quantity).toBe(3)
    expect(result.current.items[0].subtotal).toBe(30)
  })

  it('should remove item from cart', () => {
    const { result } = renderHook(() => useCartStore())

    act(() => {
      result.current.addItem({
        productId: '1',
        name: 'Test Product',
        price: 10,
        quantity: 0
      })
    })

    act(() => {
      result.current.removeItem('1')
    })

    expect(result.current.items).toHaveLength(0)
  })

  it('should clear cart', () => {
    const { result } = renderHook(() => useCartStore())

    act(() => {
      result.current.addItem({
        productId: '1',
        name: 'Test Product',
        price: 10,
        quantity: 0
      })
    })

    act(() => {
      result.current.clearCart()
    })

    expect(result.current.items).toHaveLength(0)
  })

  describe('increaseQuantity with stock check', () => {
    it('should increase quantity when stock is available', () => {
      const { result } = renderHook(() => useCartStore())
      let canIncrease
      act(() => {
        result.current.addItem({
          productId: '1',
          name: 'Test Product',
          price: 10,
          quantity: 0,
          stock: 10
        })
        canIncrease = result.current.increaseQuantity('1')
      })
      expect(canIncrease).toBe(true)
      expect(result.current.items[0].quantity).toBe(2)
    })

    it('should return false when stock is exhausted', () => {
      const { result } = renderHook(() => useCartStore())
      let canIncrease
      act(() => {
        result.current.clearCart()
      })
      act(() => {
        result.current.addItem({
          productId: '1',
          name: 'Test Product',
          price: 10,
          quantity: 5,
          stock: 5
        })
        result.current.updateQuantity('1', 5) // Ensure quantity is 5
        canIncrease = result.current.increaseQuantity('1')
      })

      expect(canIncrease).toBe(false)
      expect(result.current.items[0].quantity).toBe(5) // Should not change
    })

    it('should prevent increasing beyond stock limit', () => {
      const { result } = renderHook(() => useCartStore())

      act(() => {
        result.current.clearCart()
        result.current.addItem({
          productId: '1',
          name: 'Test Product',
          price: 10,
          quantity: 1,
          stock: 5
        })
        result.current.updateQuantity('1', 3) // Set quantity to 3
      })

      // First increase should succeed
      let canIncrease: boolean
      act(() => {
        canIncrease = result.current.increaseQuantity('1')
      })
      expect(canIncrease!).toBe(true)
      expect(result.current.items[0].quantity).toBe(4)

      // Second increase should still succeed
      act(() => {
        canIncrease = result.current.increaseQuantity('1')
      })
      expect(canIncrease).toBe(true)
      expect(result.current.items[0].quantity).toBe(5)

      // Third increase should fail (stock exhausted)
      act(() => {
        canIncrease = result.current.increaseQuantity('1')
      })
      expect(canIncrease).toBe(false)
      expect(result.current.items[0].quantity).toBe(5) // Should not change
    })
  })

  describe('decreaseQuantity', () => {
    it('should decrease quantity and implicitly increase stock', () => {
      const { result } = renderHook(() => useCartStore())

      act(() => {
        result.current.addItem({
          productId: '1',
          name: 'Test Product',
          price: 10,
          quantity: 5,
          stock: 10
        })
        result.current.updateQuantity('1', 5)
      })

      act(() => {
        result.current.decreaseQuantity('1')
      })

      expect(result.current.items[0].quantity).toBe(4)
    })
  })
})
