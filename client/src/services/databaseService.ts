import api from './api'

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