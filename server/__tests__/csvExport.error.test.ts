import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import path from 'path'
import fs from 'fs'
import request from 'supertest'
import type { Express } from 'express'

const tmpDb = path.join(process.env.TMPDIR || process.cwd(), 'csv-export-error-test.db')
for (const f of [tmpDb, tmpDb + '-wal', tmpDb + '-shm']) {
  try {
    if (fs.existsSync(f)) fs.unlinkSync(f)
  } catch {
    /* ignore */
  }
}
process.env.DATABASE_PATH = tmpDb

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

afterAll(async () => {
  try {
    const dbMod = await import('../src/database.js')
    ;(dbMod as { getDb: () => { close: () => void } }).getDb().close()
  } catch {
    /* ignore */
  }
  for (const f of [tmpDb, tmpDb + '-wal', tmpDb + '-shm']) {
    try {
      if (fs.existsSync(f)) fs.unlinkSync(f)
    } catch {
      /* ignore */
    }
  }
})

describe('POST /api/reports/csv-export error handling', () => {
  it('returns HTTP 500 with { error, message } when order fetching fails', async () => {
    const res = await request(app).post('/api/reports/csv-export')

    expect(res.status).toBe(500)
    expect(res.body.error).toBe('Failed to generate CSV export')
    expect(res.body.message).toBe('db connection closed')
  })
})