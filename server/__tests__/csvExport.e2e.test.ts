import { describe, it, expect, beforeAll, afterAll } from 'vitest'
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

const available = await probeDatabase()
const describeOk = available ? describe : describe.skip
const beforeAllOk = available ? beforeAll : () => {}

let app: Express

function csvLines(text: string): string[] {
  return text.replace('\uFEFF', '').split(/\r?\n/).filter(Boolean)
}

beforeAllOk(async () => {
  await initTestDatabase()
  await resetDatabase()

  const { default: reportsRouter } = await import('../src/routes/reports.js')
  const expressMod = await import('express')
  const express = expressMod.default

  app = express()
  app.use(express.json())
  app.use('/api/reports', reportsRouter)
})

afterAll(async () => {
  await closeTestDatabase()
})

describeOk('POST /api/reports/csv-export', () => {
  it('returns header-only CSV content when there are no orders', async () => {
    const res = await request(app).post('/api/reports/csv-export')

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/csv')
    expect(res.text.startsWith('\uFEFFOrder ID,Date/Time,Items,Total Amount,Discount,Payment Method')).toBe(true)
    expect(csvLines(res.text)).toHaveLength(1)
  })

  it('serves all orders as CSV rows with BOM, ISO datetime, 2-decimal currency, and orders_ filename', async () => {
    const p1 = await seedProduct('Line A', 30)
    const p2 = await seedProduct('Line B', 45)
    await seedOrder('cash', [{ productId: p1, quantity: 2, unitPrice: 30 }])
    await seedOrder('credit_card', [{ productId: p2, quantity: 1, unitPrice: 45 }])
    await seedOrder('cash', [{ productId: p2, quantity: 4, unitPrice: 45 }], 50)

    const res = await request(app).post('/api/reports/csv-export')

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/csv; charset=utf-8')
    const today = new Date().toISOString().split('T')[0]
    expect(res.headers['content-disposition']).toContain(`orders_${today}.csv`)
    expect(res.text.startsWith('\uFEFF')).toBe(true)

    const lines = csvLines(res.text)
    expect(lines).toHaveLength(4)
    expect(lines[0]).toBe('Order ID,Date/Time,Items,Total Amount,Discount,Payment Method')
    expect(lines[1]).toMatch(/^\d+,\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2},Line A \(2\),60\.00,0\.00,cash$/)
    expect(lines[2]).toMatch(/^\d+,\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2},Line B \(1\),45\.00,0\.00,credit_card$/)
    expect(lines[3]).toMatch(/^\d+,\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2},Line B \(4\),130\.00,50\.00,cash$/)
  })

  it('refreshes to include orders created after a prior export and stamps the current-date filename', async () => {
    const before = await request(app).post('/api/reports/csv-export')
    expect(csvLines(before.text)).toHaveLength(4)

    const p3 = await seedProduct('Fresh Product', 10)
    await seedOrder('mobile_payment', [{ productId: p3, quantity: 3, unitPrice: 10 }])

    const after = await request(app).post('/api/reports/csv-export')

    expect(after.status).toBe(200)
    const lines = csvLines(after.text)
    expect(lines).toHaveLength(5)
    expect(
      lines.some(
        (l) => l.includes('Fresh Product (3)') && l.endsWith(',0.00,mobile_payment')
      )
    ).toBe(true)
    const today = new Date().toISOString().split('T')[0]
    expect(after.headers['content-disposition']).toContain(`orders_${today}.csv`)
  })
})