import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../src/index'
import { initDb, getDb } from '../src/database'
import { seedTestData } from '../src/seedData'

describe('Order API', () => {
  let db: any
  let initialProductCount: number

  beforeAll(async () => {
    // Initialize database with test data
    const dbPath = ':memory:'
    db = initDb(dbPath)
    await seedTestData(db)
    initialProductCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count
  })

  afterAll(() => {
    // Cleanup
  })

  describe('POST /api/orders', () => {
    it('should create a new order with valid items', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({
          items: [
            { productId: '1', quantity: 2 },
            { productId: '2', quantity: 1 }
          ],
          payment_method: 'cash'
        })
      
      expect(res.status).toBe(201)
      expect(res.body.total).toBeDefined()
      expect(res.body.tax).toBeDefined()
      expect(res.body.payment_method).toBe('cash')
      expect(res.body.status).toBe('completed')
    })

    it('should reject order without items', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({ payment_method: 'cash' })
      
      expect(res.status).toBe(400)
      expect(res.body.error).toContain('Order items')
    })

    it('should reject order with invalid payment method', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({
          items: [{ productId: '1', quantity: 1 }],
          payment_method: 'invalid'
        })
      
      expect(res.status).toBe(400)
      expect(res.body.error).toContain('Invalid payment method')
    })

    it('should reject order with insufficient stock', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({
          items: [{ productId: '1', quantity: 9999 }],
          payment_method: 'cash'
        })
      
      expect(res.status).toBe(400)
      expect(res.body.error).toContain('Insufficient stock')
    })

    it('should deduct stock after order creation', async () => {
      await request(app).post('/api/orders').send({
        items: [{ productId: '1', quantity: 2 }],
        payment_method: 'cash'
      })

      const product = db.prepare('SELECT * FROM products WHERE id = ?').get('1')
      expect(product.stock).toBeLessThan(initialProductCount - 1)
    })
  })

  describe('GET /api/orders', () => {
    it('should return all orders', async () => {
      await request(app).post('/api/orders').send({
        items: [{ productId: '1', quantity: 1 }],
        payment_method: 'cash'
      })

      const res = await request(app).get('/api/orders')
      
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThan(0)
    })

    it('should return orders with items', async () => {
      await request(app).post('/api/orders').send({
        items: [
          { productId: '1', quantity: 1 },
          { productId: '2', quantity: 1 }
        ],
        payment_method: 'credit_card'
      })

      const res = await request(app).get('/api/orders')
      
      expect(res.status).toBe(200)
      expect(res.body[0].items).toBeDefined()
      expect(Array.isArray(res.body[0].items)).toBe(true)
    })
  })

  describe('GET /api/orders/:id', () => {
    it('should return a single order with items', async () => {
      const createRes = await request(app).post('/api/orders').send({
        items: [{ productId: '1', quantity: 2 }],
        payment_method: 'mobile_payment'
      })

      const orderId = createRes.body.id
      
      const res = await request(app).get(`/api/orders/${orderId}`)
      
      expect(res.status).toBe(200)
      expect(res.body.id).toBe(orderId)
      expect(res.body.items).toBeDefined()
    })

    it('should return 404 for non-existent order', async () => {
      const res = await request(app).get('/api/orders/nonexistent')
      
      expect(res.status).toBe(404)
      expect(res.body.error).toContain('Order not found')
    })
  })

  describe('Payment methods', () => {
    it('should accept cash payment', async () => {
      const res = await request(app).post('/api/orders').send({
        items: [{ productId: '1', quantity: 1 }],
        payment_method: 'cash'
      })
      
      expect(res.status).toBe(201)
      expect(res.body.payment_method).toBe('cash')
    })

    it('should accept credit_card payment', async () => {
      const res = await request(app).post('/api/orders').send({
        items: [{ productId: '1', quantity: 1 }],
        payment_method: 'credit_card'
      })
      
      expect(res.status).toBe(201)
      expect(res.body.payment_method).toBe('credit_card')
    })

    it('should accept mobile_payment', async () => {
      const res = await request(app).post('/api/orders').send({
        items: [{ productId: '1', quantity: 1 }],
        payment_method: 'mobile_payment'
      })
      
      expect(res.status).toBe(201)
      expect(res.body.payment_method).toBe('mobile_payment')
    })
  })
})
