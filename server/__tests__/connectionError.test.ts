import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'

const DEAD_URL = 'postgresql://postgres:wrong@127.0.0.1:1/postgres'

let app: Express

beforeAll(async () => {
  process.env.DATABASE_URL = DEAD_URL
  const { default: appModule } = await import('../src/index.js')
  app = appModule
})

describe('Health check with unreachable database', () => {
  it('reports 503 unavailable while the database is not connected', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(503)
    expect(res.body.status).toBe('unavailable')
  })
})