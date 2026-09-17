import { describe, it, expect, beforeAll, vi } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'

vi.mock('../src/database.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/database.js')>()
  return {
    ...actual,
    withTransaction: vi.fn(async () => {
      throw new Error('connection refused')
    }),
  }
})

let app: Express

beforeAll(async () => {
  const { default: databaseRouter } = await import('../src/routes/database.js')
  const expressMod = await import('express')

  app = expressMod.default()
  app.use(expressMod.default.json({ limit: '10mb' }))
  app.use('/api/database', databaseRouter)
})

describe('POST /api/database/import — 資料庫連線失敗', () => {
  it('withTransaction 擲錯時回傳 500 且不回寫任何資料', async () => {
    const res = await request(app)
      .post('/api/database/import')
      .send({
        mode: 'replace',
        backup: {
          exportedAt: '2026-01-01T00:00:00.000Z',
          products: [{ id: '1', name: 'A', price: 10 }],
          orders: [],
          orderItems: [],
        },
      })

    expect(res.status).toBe(500)
    expect(res.body.error).toBe('Failed to import database')
  })
})