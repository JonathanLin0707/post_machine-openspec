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
})
