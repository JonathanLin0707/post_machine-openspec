import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Layout from '../components/Layout'

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/cart']}>
      <Layout>
        <div>page content</div>
      </Layout>
    </MemoryRouter>,
  )
}

describe('Layout mobile menu', () => {
  it('hides the mobile menu by default and shows a hamburger button', () => {
    renderLayout()
    expect(screen.getByRole('button', { name: '開啟選單' })).toBeTruthy()
    expect(screen.queryByRole('navigation', { name: '手機導覽' })).toBeNull()
  })

  it('opens the menu with all nav items and database actions', () => {
    renderLayout()
    fireEvent.click(screen.getByRole('button', { name: '開啟選單' }))

    const menu = screen.getByRole('navigation', { name: '手機導覽' })
    const menuScope = within(menu)
    expect(menuScope.getByText('🛒 購物車')).toBeTruthy()
    expect(menuScope.getByText('📋 訂單查詢')).toBeTruthy()
    expect(menuScope.getByText('📦 商品管理')).toBeTruthy()
    expect(menuScope.getByText('📊 銷售報表')).toBeTruthy()
    expect(menuScope.getByText('💾 匯出資料庫')).toBeTruthy()
    expect(menuScope.getByText('📥 匯入資料庫')).toBeTruthy()
    expect(screen.getByRole('button', { name: '關閉選單' })).toBeTruthy()
  })

  it('closes the menu after navigating to an item', () => {
    renderLayout()
    fireEvent.click(screen.getByRole('button', { name: '開啟選單' }))

    const menu = screen.getByRole('navigation', { name: '手機導覽' })
    fireEvent.click(within(menu).getByText('📊 銷售報表'))

    expect(screen.queryByRole('navigation', { name: '手機導覽' })).toBeNull()
    expect(screen.getByRole('button', { name: '開啟選單' })).toBeTruthy()
  })
})
