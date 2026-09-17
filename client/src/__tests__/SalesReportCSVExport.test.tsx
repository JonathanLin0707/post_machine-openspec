import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SalesReport from '../pages/SalesReport'

const { get: mockGet, post: mockPost } = vi.hoisted(() => ({
  get: vi.fn().mockResolvedValue({ data: [] }),
  post: vi.fn(),
}))

vi.mock('../services/api', () => ({
  default: {
    get: mockGet,
    post: mockPost,
  },
}))

const today = new Date().toISOString().split('T')[0]

describe('SalesReport CSV export', () => {
  let alertSpy: ReturnType<typeof vi.spyOn>
  let createObjectUrlSpy: ReturnType<typeof vi.spyOn>
  let setAttributeSpy: ReturnType<typeof vi.spyOn>
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    if (!window.URL.createObjectURL) {
      Object.defineProperty(window.URL, 'createObjectURL', {
        writable: true,
        value: () => 'blob:mock',
      })
    }
    createObjectUrlSpy = vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:mock')
    setAttributeSpy = vi.spyOn(HTMLAnchorElement.prototype, 'setAttribute').mockImplementation(() => {})
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  const openDialog = () => {
    fireEvent.click(screen.getByText('📥 匯出 CSV'))
    expect(screen.getByText('匯出 CSV 確認')).toBeTruthy()
  }

  const confirmExport = () => {
    fireEvent.click(screen.getByRole('button', { name: '確認' }))
  }

  it('opens a confirmation dialog instead of exporting immediately', () => {
    render(<SalesReport />)
    fireEvent.click(screen.getByText('📥 匯出 CSV'))
    expect(mockPost).not.toHaveBeenCalled()
    expect(screen.getByText('確定要匯出所有訂單的 CSV 檔案嗎？')).toBeTruthy()
  })

  it('does not call the API and closes the dialog when 取消 is clicked', () => {
    render(<SalesReport />)
    openDialog()
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(mockPost).not.toHaveBeenCalled()
    expect(screen.queryByText('匯出 CSV 確認')).toBeNull()
  })

  it('shows 暫無訂單資料可匯出 and skips download when the CSV is header-only', async () => {
    mockPost.mockResolvedValue({
      data: new Blob(['\uFEFFOrder ID,Date/Time,Items,Total Amount,Discount,Payment Method'], { type: 'text/csv' }),
    })

    render(<SalesReport />)
    openDialog()
    confirmExport()

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('暫無訂單資料可匯出'))
    expect(createObjectUrlSpy).not.toHaveBeenCalled()
  })

  it('downloads a file named orders_YYYY-MM-DD.csv and closes the dialog when orders exist', async () => {
    mockPost.mockResolvedValue({
      data: new Blob(
        ['\uFEFFOrder ID,Date/Time,Items,Total Amount,Discount,Payment Method\r\n1,2026-09-17T10:30:00,Line A (2),60.00,0.00,cash'],
        { type: 'text/csv' }
      ),
    })

    render(<SalesReport />)
    openDialog()
    confirmExport()

    await waitFor(() => expect(createObjectUrlSpy).toHaveBeenCalledTimes(1))
    expect(setAttributeSpy).toHaveBeenCalledWith('download', `orders_${today}.csv`)
    await waitFor(() => expect(screen.queryByText('匯出 CSV 確認')).toBeNull())
  })

  it('shows 匯出 CSV 失敗：伺服器錯誤 on an HTTP 500 response', async () => {
    mockPost.mockRejectedValue({
      response: { status: 500 },
      message: 'Failed to generate CSV export',
    })

    render(<SalesReport />)
    openDialog()
    confirmExport()

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('匯出 CSV 失敗：伺服器錯誤'))
    expect(createObjectUrlSpy).not.toHaveBeenCalled()
  })

  it('logs the network error and shows a retry message when the request fails', async () => {
    mockPost.mockRejectedValue(new Error('Network Error'))

    render(<SalesReport />)
    openDialog()
    confirmExport()

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('匯出 CSV 失敗，請稍後再試'))
    expect(errorSpy).toHaveBeenCalled()
  })
})