import { isAxiosError } from 'axios'
import api from './api'

export type ImportMode = 'replace' | 'merge'

export async function exportDatabase(): Promise<void> {
  const response = await api.get('/database/export', {
    responseType: 'blob',
    timeout: 60000,
  })

  const blob = new Blob([response.data], {
    type: 'application/json',
  })

  const url = window.URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `grocery_${new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/:/g, '-')}.json`

  document.body.appendChild(link)
  link.click()
  link.remove()

  window.URL.revokeObjectURL(url)
}

export async function importDatabase(file: File, mode: ImportMode): Promise<void> {
  const text = await file.text()
  const backup = JSON.parse(text)
  await api.post('/database/import', { mode, backup }, { timeout: 60000 })
}

export function extractImportError(error: unknown): string {
  if (isAxiosError(error)) {
    const serverMessage = error.response?.data?.error
    if (typeof serverMessage === 'string') {
      return serverMessage
    }
  }
  return '資料庫匯入失敗'
}