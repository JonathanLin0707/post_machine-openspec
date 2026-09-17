import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import {
  closeTestDatabase,
  initTestDatabase,
  probeDatabase,
  resetDatabase,
} from './helpers.js'

const available = await probeDatabase()
const describeOk = available ? describe : describe.skip
const beforeAllOk = available ? beforeAll : () => {}

let app: Express

beforeAllOk(async () => {
  await initTestDatabase()
  const { default: appModule } = await import('../src/index.js')
  app = appModule
})

beforeEach(async () => {
  await resetDatabase()
})

afterAll(async () => {
  await closeTestDatabase()
})

describeOk('Discount end-to-end', () => {
  it('persists discounted total and reports reflect it', async () => {
    // Seed a product with stock
    const createProductRes = await request(app).post('/api/products').send({
      name: 'Test Product E2E',
      price: 100,
      category: 'test',
      stock: 10,
    })
    expect(createProductRes.status).toBe(201)

    const productId = createProductRes.body.id

    // Create order with subtotal 200 (qty 2 @ 100) and discount 50 -> total should be 150
    const createOrderRes = await request(app)
      .post('/api/orders')
      .send({
        items: [{ productId, quantity: 2 }],
        discount: 50,
        payment_method: 'cash',
      })

    expect(createOrderRes.status).toBe(201)
    const order = createOrderRes.body
    expect(order.total).toBe(150) // 200 - 50 discount
    expect(order.discount).toBe(50)

    // Fetch the order back by ID and confirm total/discount persisted
    const fetchRes = await request(app).get(`/api/orders/${order.id}`)
    expect(fetchRes.status).toBe(200)
    expect(fetchRes.body.total).toBe(150)
    expect(fetchRes.body.discount).toBe(50)

    // Daily report today summary should reflect discounted total (150), not 200
    const dailyRes = await request(app).get('/api/reports/daily')
    expect(dailyRes.status).toBe(200)
    // Force created_at to today so it shows in the report window
    const { query } = await import('../src/database.js')
    await query("UPDATE orders SET created_at = now() WHERE id = $1", [order.id])

    const dailyRes2 = await request(app).get('/api/reports/daily')
    expect(dailyRes2.status).toBe(200)
    const todaySummary = dailyRes2.body.today || {}
    // total_sales should be 150 (discounted), proving reports read stored total
    expect(todaySummary.total_sales).toBe(150)

    // Monthly and top-products reports must also return data (regression: GROUP BY)
    const monthlyRes = await request(app).get('/api/reports/monthly')
    expect(monthlyRes.status).toBe(200)
    const monthly = monthlyRes.body as { month: string; year: number; totalSales: number; orderCount: number }[]
    expect(monthly.length).toBeGreaterThan(0)
    expect(monthly.some((r) => r.orderCount >= 1 && r.totalSales >= 150)).toBe(true)

    const topRes = await request(app).get('/api/reports/top-products')
    expect(topRes.status).toBe(200)
    const topProducts = topRes.body as { name: string; quantity_sold: number }[]
    expect(topProducts.length).toBeGreaterThan(0)
    expect(topProducts[0].name).toBe('Test Product E2E')
  })

  it('rejects discount exceeding subtotal with 400', async () => {
    const createProductRes = await request(app).post('/api/products').send({
      name: 'Test Product Over',
      price: 100,
      category: 'test',
      stock: 10,
    })
    expect(createProductRes.status).toBe(201)

    const badOrder = await request(app)
      .post('/api/orders')
      .send({
        items: [{ productId: createProductRes.body.id, quantity: 1 }], // subtotal 100
        discount: 150, // exceeds subtotal
        payment_method: 'cash',
      })

    expect(badOrder.status).toBe(400)
    expect(badOrder.body.error).toMatch(/exceed/i)
  })
})