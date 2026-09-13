import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../src/index.js'
import path from 'path'
import fs from 'fs'

// Use an isolated temp DB so we never touch the real grocery.db
const tmpDb = path.join(process.env.TMPDIR || process.cwd(), 'e2e-test-grocery.db')
if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb)
process.env.DATABASE_PATH = tmpDb

describe('Discount end-to-end', () => {
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
    console.log('Created order:', JSON.stringify(order))
    expect(order.total).toBe(150) // 200 - 50 discount
    expect(order.discount).toBe(50)

    // Fetch the order back by ID and confirm total/discount persisted
    const fetchRes = await request(app).get(`/api/orders/${order.id}`)
    expect(fetchRes.status).toBe(200)
    console.log('Fetched order:', JSON.stringify(fetchRes.body))
    expect(fetchRes.body.total).toBe(150)
    expect(fetchRes.body.discount).toBe(50)

    // Daily report today summary should reflect discounted total (150), not 200
    const dailyRes = await request(app).get('/api/reports/daily')
    expect(dailyRes.status).toBe(200)
    console.log('Daily report:', JSON.stringify(dailyRes.body))
    // Force created_at to today so it shows in the report window
    const db = (await import('better-sqlite3')).default(tmpDb)
    db.exec("UPDATE orders SET created_at = datetime('now') WHERE id = ?", [order.id])
    db.close()

    const dailyRes2 = await request(app).get('/api/reports/daily')
    expect(dailyRes2.status).toBe(200)
    const todaySummary = dailyRes2.body.today || {}
    console.log('Today summary:', JSON.stringify(todaySummary))
    // total_sales should be 150 (discounted), proving reports read stored total
    expect(todaySummary.total_sales).toBe(150)

    fs.unlinkSync(tmpDb)
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
    console.log('Rejected order:', JSON.stringify(badOrder.body))
    expect(badOrder.body.error).toMatch(/exceed/i)
  })
})
