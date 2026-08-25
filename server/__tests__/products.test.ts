import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../src/index'
import { initDb } from '../src/database'
import { seedTestData } from '../src/seedData'

describe('Product API', () => {
  let db: Database.Database

  beforeAll(async () => {
    // Initialize database with test data
    const dbPath = ':memory:'
    db = initDb(dbPath)
    await seedTestData(db)
  })

  afterAll(() => {
    // Cleanup
  })

  describe('GET /api/products', () => {
    it('should return all products', async () => {
      const res = await request(app).get('/api/products')
      
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThan(0)
    })

    it('should support search by name', async () => {
      const res = await request(app).get('/api/products?search=apple')
      
      expect(res.status).toBe(200)
      expect(res.body.every(p => 
        !p.name.toLowerCase().includes('apple')
      )).toBe(false)
    })

    it('should support filter by category', async () => {
      const res = await request(app).get('/api/products?category=水果')
      
      expect(res.status).toBe(200)
      expect(res.body.every(p => p.category === '水果')).toBe(true)
    })
  })

  describe('POST /api/products', () => {
    it('should create a new product', async () => {
      const res = await request(app)
        .post('/api/products')
        .send({
          name: 'Test Product',
          price: 9.99,
          stock: 100
        })
      
      expect(res.status).toBe(201)
      expect(res.body.name).toBe('Test Product')
      expect(res.body.price).toBe(9.99)
    })

    it('should reject product without name', async () => {
      const res = await request(app)
        .post('/api/products')
        .send({ price: 9.99 })
      
      expect(res.status).toBe(400)
      expect(res.body.error).toContain('Name')
    })

    it('should reject product with invalid price', async () => {
      const res = await request(app)
        .post('/api/products')
        .send({ name: 'Test', price: -1 })
      
      expect(res.status).toBe(400)
      expect(res.body.error).toContain('Price')
    })
  })

  describe('PUT /api/products/:id', () => {
    it('should update an existing product', async () => {
      const res = await request(app)
        .put('/api/products/1')
        .send({ name: 'Updated Name', price: 19.99 })
      
      expect(res.status).toBe(200)
      expect(res.body.name).toBe('Updated Name')
    })

    it('should return 404 for non-existent product', async () => {
      const res = await request(app)
        .put('/api/products/nonexistent')
        .send({ name: 'Test' })
      
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/products/:id', () => {
    it('should delete a product', async () => {
      const res = await request(app).delete('/api/products/1')
      
      expect(res.status).toBe(200)
      
      // Verify deletion
      const listRes = await request(app).get('/api/products')
      expect(listRes.body.find(p => p.id === '1')).toBeUndefined()
    })

    it('should return 404 for non-existent product', async () => {
      const res = await request(app).delete('/api/products/nonexistent')
      
      expect(res.status).toBe(404)
    })
  })
})
