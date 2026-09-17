import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Layout from '../components/Layout'

const { exportDatabase: mockExportDatabase, importDatabase: mockImportDatabase } = vi.hoisted(() => ({
  exportDatabase: vi.fn(),
  importDatabase: vi.fn(),
}))

vi.mock('../services/databaseService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/databaseService')>()
  return {
    ...actual,
    exportDatabase: mockExportDatabase,
    importDatabase: mockImportDatabase,
  }
})

function selectImportFile(file: File) {
  fireEvent.change(screen.getByLabelText('備份檔案 (.json)'), { target: { files: [file] } })
}

function makeJsonFile(): File {
  return new File(
    [JSON.stringify({ exportedAt: '2026-01-01T00:00:00.000Z', products: [], orders: [], orderItems: [] })],
    'grocery.json',
    { type: 'application/json' }
  )
}

function serverError(message: string): AxiosError {
  return new AxiosError(
    'Request failed with status code 400',
    AxiosError.ERR_BAD_REQUEST,
    undefined,
    undefined,
    {
      data: { error: message },
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: {} as InternalAxiosRequestConfig,
    },
  )
}

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

describe('Layout database import', () => {
  let alertSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('opens the import dialog when 匯入資料庫 is clicked', () => {
    renderLayout()
    fireEvent.click(screen.getByText('📥 匯入資料庫'))
    expect(screen.getByText('匯入資料庫')).toBeTruthy()
  })

  it('imports in the chosen mode, closes the dialog and alerts success', async () => {
    mockImportDatabase.mockResolvedValue(undefined)
    renderLayout()
    fireEvent.click(screen.getByText('📥 匯入資料庫'))
    const file = makeJsonFile()
    selectImportFile(file)
    fireEvent.click(screen.getByRole('radio', { name: '完整取代' }))
    fireEvent.click(screen.getByRole('button', { name: '確認' }))

    await waitFor(() => expect(mockImportDatabase).toHaveBeenCalledWith(file, 'replace'))
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('資料庫匯入成功'))
    expect(screen.queryByText('匯入資料庫')).toBeNull()
  })

  it('keeps the dialog open and shows the error when the import fails', async () => {
    mockImportDatabase.mockRejectedValue(serverError('import failed'))
    renderLayout()
    fireEvent.click(screen.getByText('📥 匯入資料庫'))
    selectImportFile(makeJsonFile())
    fireEvent.click(screen.getByRole('button', { name: '確認' }))

    await waitFor(() => expect(screen.getByText('import failed')).toBeTruthy())
    expect(alertSpy).not.toHaveBeenCalledWith('資料庫匯入成功')
    expect(screen.getByText('匯入資料庫')).toBeTruthy()
  })
})