import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ExportConfirmationDialog from '../components/ExportConfirmationDialog/ExportConfirmationDialog'

const baseProps = {
  title: '匯出資料庫確認',
  message: '確定要將目前的資料庫匯出為檔案嗎？',
  confirmLabel: '確認',
  cancelLabel: '取消',
  isProcessing: false,
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
}

describe('ExportConfirmationDialog', () => {
  it('renders the title and message', () => {
    render(<ExportConfirmationDialog {...baseProps} />)
    expect(screen.getByText('匯出資料庫確認')).toBeTruthy()
    expect(screen.getByText('確定要將目前的資料庫匯出為檔案嗎？')).toBeTruthy()
  })

  it('fires onCancel when the cancel button is clicked', () => {
    const onCancel = vi.fn()
    render(<ExportConfirmationDialog {...baseProps} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('fires onConfirm when the confirm button is clicked', () => {
    const onConfirm = vi.fn()
    render(<ExportConfirmationDialog {...baseProps} onConfirm={onConfirm} />)
    fireEvent.click(screen.getByRole('button', { name: '確認' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('disables both buttons while processing', () => {
    render(<ExportConfirmationDialog {...baseProps} isProcessing={true} />)
    expect(screen.getByRole('button', { name: '取消' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '處理中...' })).toBeDisabled()
  })
})