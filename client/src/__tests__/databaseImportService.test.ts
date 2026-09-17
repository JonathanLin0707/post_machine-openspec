import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { importDatabase, extractImportError } from '../services/databaseService'

const { mockPost } = vi.hoisted(() => ({ mockPost: vi.fn() }))

vi.mock('../services/api', () => ({ default: { post: mockPost } }))

const backup = {
  exportedAt: '2026-01-01T00:00:00.000Z',
  products: [],
  orders: [],
  orderItems: [],
}

function makeFile(content: string, name = 'grocery.json'): File {
  return new File([content], name, { type: 'application/json' })
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

describe('databaseService.importDatabase', () => {
  beforeEach(() => {
    mockPost.mockReset()
  })

  it('parses the .json file and posts mode + backup to the import endpoint', async () => {
    mockPost.mockResolvedValue({ data: { success: true } })
    const file = makeFile(JSON.stringify(backup))

    await importDatabase(file, 'merge')

    expect(mockPost).toHaveBeenCalledWith('/database/import', { mode: 'merge', backup }, { timeout: 60000 })
  })

  it('rejects the promise when the file is not valid JSON', async () => {
    const file = makeFile('{ not valid json', 'broken.json')

    await expect(importDatabase(file, 'replace')).rejects.toThrow()
    expect(mockPost).not.toHaveBeenCalled()
  })
})

describe('databaseService.extractImportError', () => {
  it('returns the server error message when the response provides one', () => {
    expect(extractImportError(serverError('備份格式不正確'))).toBe('備份格式不正確')
  })

  it('falls back to a default message otherwise', () => {
    expect(extractImportError(new Error('boom'))).toBe('資料庫匯入失敗')
    expect(extractImportError(null)).toBe('資料庫匯入失敗')
    expect(extractImportError({ response: { data: {} } })).toBe('資料庫匯入失敗')
  })
})