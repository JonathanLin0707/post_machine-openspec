import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import type { Express, Request, Response, NextFunction } from 'express'
import {
  closeTestDatabase,
  initTestDatabase,
  probeDatabase,
  resetDatabase,
  seedProduct,
  seedOrder,
} from './helpers.js'
import { query } from '../src/database.js'

const available = await probeDatabase()
const describeOk = available ? describe : describe.skip
const beforeAllOk = available ? beforeAll : () => {}
const beforeEachOk = available ? beforeEach : () => {}

let app: Express

function backup(
  products: Record<string, unknown>[] = [],
  orders: Record<string, unknown>[] = [],
  orderItems: Record<string, unknown>[] = [],
) {
  return {
    exportedAt: new Date().toISOString(),
    products,
    orders,
    orderItems,
  }
}

function product(
  id: number | string,
  name: string,
  price: number,
  extra: Record<string, unknown> = {},
) {
  return {
    id,
    name,
    price,
    barcode: null,
    category: null,
    stock: 100,
    image_url: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...extra,
  }
}

function order(
  id: number | string,
  total: number,
  paymentMethod: string,
  extra: Record<string, unknown> = {},
) {
  return {
    id,
    total,
    tax: 0,
    discount: 0,
    payment_method: paymentMethod,
    status: 'completed',
    created_at: '2026-01-01T00:00:00.000Z',
    ...extra,
  }
}

function orderItem(
  id: number | string,
  orderId: number | string,
  productId: number | string,
  quantity: number,
  unitPrice: number,
) {
  return {
    id,
    order_id: orderId,
    product_id: productId,
    quantity,
    unit_price: unitPrice,
    subtotal: unitPrice * quantity,
  }
}

async function productCount(): Promise<number> {
  const { rows } = await query<{ cnt: string }>('SELECT COUNT(*)::text AS cnt FROM products')
  return Number(rows[0].cnt)
}

async function orderCount(): Promise<number> {
  const { rows } = await query<{ cnt: string }>('SELECT COUNT(*)::text AS cnt FROM orders')
  return Number(rows[0].cnt)
}

async function orderItemCount(): Promise<number> {
  const { rows } = await query<{ cnt: string }>('SELECT COUNT(*)::text AS cnt FROM order_items')
  return Number(rows[0].cnt)
}

async function productById(id: number | string) {
  const { rows } = await query<{ id: string; name: string; price: number; barcode: string | null; stock: number }>(
    'SELECT id, name, price, barcode, stock FROM products WHERE id = $1',
    [String(id)],
  )
  return rows[0] ?? null
}

beforeAllOk(async () => {
  await initTestDatabase()
  await resetDatabase()

  const { default: databaseRouter } = await import('../src/routes/database.js')
  const expressMod = await import('express')

  app = expressMod.default()
  app.use(expressMod.default.json({ limit: '10mb' }))
  app.use('/api/database', databaseRouter)
  app.use(
    (
      err: Error & { status?: number },
      _req: Request,
      res: Response,
      _next: NextFunction,
    ) => {
      void _next
      res.status(err.status ?? 500).json({ error: err.message })
    },
  )
})

beforeEachOk(async () => {
  await resetDatabase()
})

afterAll(async () => {
  await closeTestDatabase()
})

describeOk('POST /api/database/import — replace 模式', () => {
  it('清空既有資料後以備份內容重建，保留原始 id', async () => {
    const p1 = await seedProduct('既存商品', 50)
    await seedOrder('cash', [{ productId: p1, quantity: 1, unitPrice: 50 }])

    const res = await request(app)
      .post('/api/database/import')
      .send({
        mode: 'replace',
        backup: backup(
          [product('7', '新甲', 10), product('8', '新乙', 20)],
          [order('9', 10, 'credit_card')],
          [orderItem('10', '9', '7', 2, 10)],
        ),
      })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.products).toBe(2)
    expect(res.body.orders).toBe(1)
    expect(res.body.orderItems).toBe(1)

    expect(await productCount()).toBe(2)
    expect(await orderCount()).toBe(1)
    expect(await orderItemCount()).toBe(1)

    const p = await productById('7')
    expect(p).not.toBeNull()
    expect(p!.name).toBe('新甲')
    expect(p!.price).toBe(10)
  })

  it('匯入低 id 後序列同步，後續新增 id 不與備份衝突', async () => {
    const seedRes = await request(app)
      .post('/api/database/import')
      .send({
        mode: 'replace',
        backup: backup([product('1', '備份商品', 1)], [], []),
      })
    expect(seedRes.status).toBe(200)

    const { rows } = await query<{ id: string }>(
      'INSERT INTO products (name, price) VALUES ($1, $2) RETURNING id',
      ['後續新增', 2],
    )
    expect(rows[0].id).toBe('2')

    const kept = await productById('1')
    expect(kept!.name).toBe('備份商品')
  })
})

describeOk('POST /api/database/import — merge 模式', () => {
  it('存在列更新、不存在列插入、未涵蓋列保留', async () => {
    const p1 = await seedProduct('既有商品', 50)
    const p2 = await seedProduct('待保留商品', 75)

    const res = await request(app)
      .post('/api/database/import')
      .send({
        mode: 'merge',
        backup: backup(
          [
            product(p1, '已更新商品', 80),
            product('999', '全新商品', 10),
          ],
          [],
          [],
        ),
      })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    expect(await productCount()).toBe(3)

    const updated = await productById(p1)
    expect(updated!.name).toBe('已更新商品')
    expect(updated!.price).toBe(80)

    const fresh = await productById('999')
    expect(fresh!.name).toBe('全新商品')

    const untouched = await productById(p2)
    expect(untouched!.name).toBe('待保留商品')
    expect(untouched!.price).toBe(75)
  })

  it('空資料表亦可插入', async () => {
    const res = await request(app)
      .post('/api/database/import')
      .send({
        mode: 'merge',
        backup: backup([product('1', 'A', 5)], [order('2', 5, 'cash')], [orderItem('3', '2', '1', 1, 5)]),
      })

    expect(res.status).toBe(200)
    expect(await productCount()).toBe(1)
    expect(await orderCount()).toBe(1)
    expect(await orderItemCount()).toBe(1)
  })
})

describeOk('POST /api/database/import — 格式驗證', () => {
  it('缺少必要欄位時回傳 400 且不更動資料', async () => {
    await seedProduct('不會變', 10)
    const res = await request(app)
      .post('/api/database/import')
      .send({ mode: 'replace', backup: {} })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/exportedAt/)
    expect(await productCount()).toBe(1)
  })

  it('非合法 JSON body 回傳 400 且不更動資料', async () => {
    await seedProduct('不會變', 10)
    const res = await request(app)
      .post('/api/database/import')
      .set('Content-Type', 'application/json')
      .send('{not json')

    expect(res.status).toBe(400)
    expect(await productCount()).toBe(1)
  })

  it('mode 非 replace/merge 時回傳 400', async () => {
    const res = await request(app)
      .post('/api/database/import')
      .send({
        mode: 'bad',
        backup: backup([], [], []),
      })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/mode/)
  })
})

describeOk('POST /api/database/import — 回滾測試', () => {
  it('懸空引用於寫入前回傳 400，資料維持匯入前狀態', async () => {
    const p1 = await seedProduct('不會被删', 10)
    await seedProduct('第二個', 20)
    await seedOrder('cash', [{ productId: p1, quantity: 1, unitPrice: 10 }])
    const origProductCount = await productCount()
    const origOrderCount = await orderCount()
    const origOrderItemCount = await orderItemCount()

    const res = await request(app)
      .post('/api/database/import')
      .send({
        mode: 'replace',
        backup: backup(
          [product('7', '新A', 10)],
          [order('8', 10, 'cash')],
          [orderItem('9', '8', '999', 1, 10)],
        ),
      })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/不存在的 product id/)
    expect(await productCount()).toBe(origProductCount)
    expect(await orderCount()).toBe(origOrderCount)
    expect(await orderItemCount()).toBe(origOrderItemCount)

    const p = await productById(p1)
    expect(p!.name).toBe('不會被删')
  })

  it('name 唯一性衝突時整體回滾', async () => {
    await seedProduct('衝突名稱', 10)
    const origCount = await productCount()

    const res = await request(app)
      .post('/api/database/import')
      .send({
        mode: 'replace',
        backup: backup([
          product('7', '衝突名稱', 10),
          product('8', '衝突名稱', 20),
        ]),
      })

    expect(res.status).toBe(500)
    expect(await productCount()).toBe(origCount)
  })
})

describeOk('POST /api/database/import — 空備份', () => {
  it('replace 清空既有資料', async () => {
    const p1 = await seedProduct('會被删', 10)
    await seedOrder('cash', [{ productId: p1, quantity: 2, unitPrice: 10 }])

    const res = await request(app)
      .post('/api/database/import')
      .send({ mode: 'replace', backup: backup([], [], []) })

    expect(res.status).toBe(200)
    expect(await productCount()).toBe(0)
    expect(await orderCount()).toBe(0)
    expect(await orderItemCount()).toBe(0)
  })

  it('merge 保留既有資料並回傳成功', async () => {
    await seedProduct('保留', 10)

    const res = await request(app)
      .post('/api/database/import')
      .send({ mode: 'merge', backup: backup([], [], []) })

    expect(res.status).toBe(200)
    expect(await productCount()).toBe(1)
  })
})

describeOk('POST /api/database/import — 大型備份（>100kb）', () => {
  it('10mb body limit 正常接收大型備份', async () => {
    const manyProducts = Array.from({ length: 2500 }, (_, i) => ({
      id: String(i + 1),
      name: `商品${String(i + 1).padStart(4, '0')}-附註描述文字用於推升備份檔大小至一百kb以上`,
      price: (i + 1) * 10,
      barcode: null,
      category: null,
      stock: 10,
      image_url: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    }))

    const body = JSON.stringify({
      mode: 'replace',
      backup: backup(manyProducts, [], []),
    })

    expect(body.length).toBeGreaterThan(100_000)

    const res = await request(app)
      .post('/api/database/import')
      .set('Content-Type', 'application/json')
      .send(body)

    expect(res.status).toBe(200)
    expect(await productCount()).toBe(2500)
  })
})