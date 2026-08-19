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
      result.current.updateQuantity('1', 1)
    })

    expect(result.current.items[0].quantity).toBe(2)
    expect(result.current.items[0].subtotal).toBe(20)
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
      
      act(() => {
        result.current.addItem({
          productId: '1',
          name: 'Test Product',
          price: 10,
          quantity: 0,
          stock: 10
        })
      })

      const canIncrease = result.current.increaseQuantity('1')
      
      expect(canIncrease).toBe(true)
      expect(result.current.items[0].quantity).toBe(1)
    })

    it('should return false when stock is exhausted', () => {
      const { result } = renderHook(() => useCartStore())
      
      act(() => {
        result.current.addItem({
          productId: '1',
          name: 'Test Product',
          price: 10,
          quantity: 5,
          stock: 5
        })
      })

      const canIncrease = result.current.increaseQuantity('1')
      
      expect(canIncrease).toBe(false)
      expect(result.current.items[0].quantity).toBe(5) // Should not change
    })

    it('should prevent increasing beyond stock limit', () => {
      const { result } = renderHook(() => useCartStore())
      
      act(() => {
        result.current.addItem({
          productId: '1',
          name: 'Test Product',
          price: 10,
          quantity: 3,
          stock: 5
        })
      })

      // First increase should succeed
      expect(result.current.increaseQuantity('1')).toBe(true)
      expect(result.current.items[0].quantity).toBe(4)
      
      // Second increase should still succeed
      expect(result.current.increaseQuantity('1')).toBe(true)
      expect(result.current.items[0].quantity).toBe(5)
      
      // Third increase should fail (stock exhausted)
      expect(result.current.increaseQuantity('1')).toBe(false)
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
      })

      act(() => {
        result.current.decreaseQuantity('1')
      })

      expect(result.current.items[0].quantity).toBe(4)
    })

    it('should not decrease when quantity is already at minimum', () => {
      const { result } = renderHook(() => useCartStore())
      
      act(() => {
        result.current.addItem({
          productId: '1',
          name: 'Test Product',
          price: 10,
          quantity: 1,
          stock: 5
        })
      })

      const stateBefore = result.current.items[0].quantity
      
      act(() => {
        result.current.decreaseQuantity('1')
      })

      expect(result.current.items[0].quantity).toBe(stateBefore) // Should not change
    })
  })
})
