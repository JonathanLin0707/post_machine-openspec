import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Layout from '../components/Layout'

const { exportDatabase: mockExportDatabase } = vi.hoisted(() => ({
  exportDatabase: vi.fn(),
}))

vi.mock('../services/databaseService', () => ({
  exportDatabase: mockExportDatabase,
}))

function renderLayout() {
  return render(
    <MemoryRouter>
      <Layout>
        <div>page content</div>
      </Layout>
    </MemoryRouter>
  )
}

describe('Layout database export confirmation', () => {
  let alertSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('opens the confirmation dialog when 匯出資料庫 is clicked', () => {
    renderLayout()
    fireEvent.click(screen.getByText('💾 匯出資料庫'))
    expect(screen.getByText('匯出資料庫確認')).toBeTruthy()
  })

  it('does not export and closes the dialog when 取消 is clicked', () => {
    renderLayout()
    fireEvent.click(screen.getByText('💾 匯出資料庫'))
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(mockExportDatabase).not.toHaveBeenCalled()
    expect(screen.queryByText('匯出資料庫確認')).toBeNull()
  })

  it('exports and closes the dialog when 確認 is clicked', async () => {
    mockExportDatabase.mockResolvedValue(undefined)
    renderLayout()
    fireEvent.click(screen.getByText('💾 匯出資料庫'))
    fireEvent.click(screen.getByRole('button', { name: '確認' }))
    await waitFor(() => expect(mockExportDatabase).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.queryByText('匯出資料庫確認')).toBeNull())
  })

  it('closes the dialog and shows 資料庫匯出失敗 when the export fails', async () => {
    mockExportDatabase.mockRejectedValue(new Error('export failed'))
    renderLayout()
    fireEvent.click(screen.getByText('💾 匯出資料庫'))
    fireEvent.click(screen.getByRole('button', { name: '確認' }))
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('資料庫匯出失敗'))
    expect(screen.queryByText('匯出資料庫確認')).toBeNull()
  })
})