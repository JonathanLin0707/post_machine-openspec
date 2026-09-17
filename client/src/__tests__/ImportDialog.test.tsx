import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ImportDialog from '../components/ImportDialog/ImportDialog'

const { mockImportDatabase } = vi.hoisted(() => ({ mockImportDatabase: vi.fn() }))

vi.mock('../services/databaseService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/databaseService')>()
  return {
    ...actual,
    importDatabase: mockImportDatabase,
  }
})

const backup = {
  exportedAt: '2026-01-01T00:00:00.000Z',
  products: [],
  orders: [],
  orderItems: [],
}

function makeJsonFile(name = 'grocery.json'): File {
  return new File([JSON.stringify(backup)], name, { type: 'application/json' })
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

function renderDialog(onImported = vi.fn()) {
  const onCancel = vi.fn()
  const result = render(<ImportDialog onCancel={onCancel} onImported={onImported} />)
  return { onCancel, onImported, result }
}

function selectFile(file: File) {
  fireEvent.change(screen.getByLabelText('備份檔案 (.json)'), { target: { files: [file] } })
}

describe('ImportDialog', () => {
  beforeEach(() => {
    mockImportDatabase.mockReset()
  })

  it('renders the file input and both import mode options with 完整取代 selected by default', () => {
    renderDialog()
    expect(screen.getByLabelText('備份檔案 (.json)')).toBeTruthy()
    const replaceRadio = screen.getByRole('radio', { name: '完整取代' })
    const mergeRadio = screen.getByRole('radio', { name: '合併' })
    expect(replaceRadio).toBeTruthy()
    expect(mergeRadio).toBeTruthy()
    expect(replaceRadio).toBeChecked()
    expect(mergeRadio).not.toBeChecked()
  })

  it('cancels without importing when 取消 is clicked', () => {
    const { onCancel } = renderDialog()
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(mockImportDatabase).not.toHaveBeenCalled()
  })

  it('shows an error instead of importing when no file is selected', () => {
    renderDialog()
    fireEvent.click(screen.getByRole('button', { name: '確認' }))
    expect(screen.getByText('請選擇 .json 備份檔')).toBeTruthy()
    expect(mockImportDatabase).not.toHaveBeenCalled()
  })

  it('rejects a non-.json file before any import is attempted', () => {
    renderDialog()
    selectFile(new File(['x'], 'data.txt', { type: 'text/plain' }))
    fireEvent.click(screen.getByRole('button', { name: '確認' }))
    expect(screen.getByText('僅支援 .json 備份檔')).toBeTruthy()
    expect(mockImportDatabase).not.toHaveBeenCalled()
  })

  it('imports the selected file in the chosen mode and notifies on success', async () => {
    mockImportDatabase.mockResolvedValue(undefined)
    const { onImported } = renderDialog()
    const file = makeJsonFile()
    selectFile(file)
    fireEvent.click(screen.getByRole('radio', { name: '合併' }))
    fireEvent.click(screen.getByRole('button', { name: '確認' }))

    await waitFor(() => expect(mockImportDatabase).toHaveBeenCalledWith(file, 'merge'))
    await waitFor(() => expect(onImported).toHaveBeenCalledTimes(1))
  })

  it('keeps the dialog open and shows the server error when the import fails', async () => {
    mockImportDatabase.mockRejectedValue(serverError('備份格式不正確'))
    const { onImported } = renderDialog()
    selectFile(makeJsonFile())
    fireEvent.click(screen.getByRole('button', { name: '確認' }))

    await waitFor(() => expect(screen.getByText('備份格式不正確')).toBeTruthy())
    expect(onImported).not.toHaveBeenCalled()
    expect(screen.getByText('匯入資料庫')).toBeTruthy()
  })
})