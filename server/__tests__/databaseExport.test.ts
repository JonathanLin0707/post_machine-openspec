import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import {
  closeTestDatabase,
  initTestDatabase,
  probeDatabase,
  resetDatabase,
  seedOrder,
  seedProduct,
} from './helpers.js'

// Mock only the `query` function so the failure test can force a read error
// without permanently ending the shared pool.
vi.mock('../src/database.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/database.js')>()
  return {
    ...actual,
    query: vi.fn(async (text: string, params?: unknown[]) =>
      actual.query(text, params ?? []),
    ),
  }
})

const available = await probeDatabase()
const describeOk = available ? describe : describe.skip
const beforeAllOk = available ? beforeAll : () => {}

let app: Express

beforeAllOk(async () => {
  await initTestDatabase()
  await resetDatabase()

  const { default: databaseRouter } = await import('../src/routes/database.js')
  const expressMod = await import('express')

  app = expressMod.default()
  app.use('/api/database', databaseRouter)
})

afterAll(async () => {
  await closeTestDatabase()
})

describeOk('GET /api/database/export', () => {
  it('downloads a complete JSON backup of all three tables', async () => {
    const p1 = await seedProduct('Export 甲', 30)
    const p2 = await seedProduct('Export 乙', 45)
    await seedOrder('cash', [
      { productId: p1, quantity: 2, unitPrice: 30 },
      { productId: p2, quantity: 1, unitPrice: 45 },
    ])
    await seedOrder('credit_card', [{ productId: p2, quantity: 1, unitPrice: 45 }])

    const res = await request(app).get('/api/database/export')

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('application/json')
    expect(res.headers['content-disposition']).toContain('attachment')
    expect(res.headers['content-disposition']).toMatch(/grocery_backup_.*\.json/)

    const body = JSON.parse(res.text)
    expect(typeof body.exportedAt).toBe('string')
    expect(Array.isArray(body.products)).toBe(true)
    expect(Array.isArray(body.orders)).toBe(true)
    expect(Array.isArray(body.orderItems)).toBe(true)
    expect(body.products.length).toBeGreaterThanOrEqual(2)
    expect(body.orders).toHaveLength(2)
    expect(body.orderItems).toHaveLength(3)
    expect(body.orders[0].total).toBe(105)
  })

  it('returns 500 with no partial backup file when data read fails', async () => {
    const { query } = await import('../src/database.js')
    vi.mocked(query).mockImplementationOnce(async () => {
      throw new Error('boom')
    })

    const res = await request(app).get('/api/database/export')

    expect(res.status).toBe(500)
    expect(res.body.error).toBe('Failed to export database')
  })
})