import { describe, it, expect, beforeAll, vi } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'

vi.mock('../src/services/csvExportService.js', () => ({
  CsvExportService: class {
    constructor() {}

    async fetchAllOrders(): Promise<never> {
      throw new Error('db connection closed')
    }

    formatAsCSV(): string {
      return ''
    }
  },
}))

let app: Express

beforeAll(async () => {
  const { default: reportsRouter } = await import('../src/routes/reports.js')
  const expressMod = await import('express')
  const express = expressMod.default

  app = express()
  app.use(express.json())
  app.use('/api/reports', reportsRouter)
})

describe('POST /api/reports/csv-export error handling', () => {
  it('returns HTTP 500 with { error, message } when order fetching fails', async () => {
    const res = await request(app).post('/api/reports/csv-export')

    expect(res.status).toBe(500)
    expect(res.body.error).toBe('Failed to generate CSV export')
    expect(res.body.message).toBe('db connection closed')
  })
})