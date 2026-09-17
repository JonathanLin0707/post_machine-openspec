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
  })

  it('shows 暫無訂單資料可匯出 and skips download when the CSV is header-only', async () => {
    mockPost.mockResolvedValue({
      data: new Blob(['\uFEFFOrder ID,Date/Time,Items,Total Amount,Payment Method'], { type: 'text/csv' }),
    })

    render(<SalesReport />)
    fireEvent.click(screen.getByText('📥 匯出 CSV'))

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('暫無訂單資料可匯出'))
    expect(createObjectUrlSpy).not.toHaveBeenCalled()
  })

  it('downloads a file named orders_YYYY-MM-DD.csv when orders exist', async () => {
    mockPost.mockResolvedValue({
      data: new Blob(
        ['\uFEFFOrder ID,Date/Time,Items,Total Amount,Payment Method\r\n1,2026-09-17T10:30:00,Line A (2),60.00,cash'],
        { type: 'text/csv' }
      ),
    })

    render(<SalesReport />)
    fireEvent.click(screen.getByText('📥 匯出 CSV'))

    await waitFor(() => expect(createObjectUrlSpy).toHaveBeenCalledTimes(1))
    expect(setAttributeSpy).toHaveBeenCalledWith('download', `orders_${today}.csv`)
  })

  it('shows 匯出 CSV 失敗：伺服器錯誤 on an HTTP 500 response', async () => {
    mockPost.mockRejectedValue({
      response: { status: 500 },
      message: 'Failed to generate CSV export',
    })

    render(<SalesReport />)
    fireEvent.click(screen.getByText('📥 匯出 CSV'))

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('匯出 CSV 失敗：伺服器錯誤'))
    expect(createObjectUrlSpy).not.toHaveBeenCalled()
  })

  it('logs the network error and shows a retry message when the request fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockPost.mockRejectedValue(new Error('Network Error'))

    render(<SalesReport />)
    fireEvent.click(screen.getByText('📥 匯出 CSV'))

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('匯出 CSV 失敗，請稍後再試'))
    expect(errorSpy).toHaveBeenCalled()
  })
})