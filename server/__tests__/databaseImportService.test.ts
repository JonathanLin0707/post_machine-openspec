import { describe, it, expect } from 'vitest'
import {
  DatabaseImportService,
  HttpError,
  validateBackup,
} from '../src/services/databaseImportService.js'
import type { Queryable } from '../src/database.js'

interface Call {
  text: string
  params?: unknown[]
}

function makeBackup(
  products: Record<string, unknown>[] = [],
  orders: Record<string, unknown>[] = [],
  orderItems: Record<string, unknown>[] = [],
): Record<string, unknown> {
  return {
    exportedAt: '2026-01-01T00:00:00.000Z',
    products,
    orders,
    orderItems,
  }
}

function makeHarness(rowsBySql: Record<string, Array<{ id: unknown }>> = {}) {
  const calls: Call[] = []
  let failOn: string | null = null

  const tx: Queryable = {
    async query(text: string, params?: unknown[]) {
      calls.push({ text, params })
      if (failOn && text.includes(failOn)) {
        throw new Error('db boom')
      }
      for (const needle of Object.keys(rowsBySql)) {
        if (text.includes(needle)) {
          const rows = rowsBySql[needle]
          return { rows, rowCount: rows.length }
        }
      }
      return { rows: [], rowCount: 0 }
    },
  }

  const runner = async (fn: (tx: Queryable) => Promise<unknown>) => {
    try {
      const result = await fn(tx)
      calls.push({ text: 'COMMIT' })
      return result
    } catch (err) {
      calls.push({ text: 'ROLLBACK' })
      throw err
    }
  }

  return {
    calls,
    service: new DatabaseImportService(runner),
    failOnNext: (needle: string) => {
      failOn = needle
    },
  }
}

async function expectHttpError(promise: Promise<unknown>, status: number): Promise<void> {
  try {
    await promise
    expect.unreachable('should have thrown')
  } catch (err) {
    expect(err).toBeInstanceOf(HttpError)
    expect((err as HttpError).status).toBe(status)
  }
}

describe('databaseImportService 格式驗證', () => {
  it('mode 非 replace/merge 時擲出 400', async () => {
    const { service } = makeHarness()
    await expectHttpError(service.importBackup(undefined, makeBackup()), 400)
    await expectHttpError(service.importBackup('bad', makeBackup()), 400)
  })

  it('backup 非物件時擲出 400', () => {
    expect(() => validateBackup(null)).toThrow(HttpError)
    expect(() => validateBackup([])).toThrow(HttpError)
    expect(() => validateBackup(42)).toThrow(HttpError)
  })

  it('exportedAt 非字串時擲出 400', () => {
    expect(() => validateBackup({ exportedAt: 123, products: [], orders: [], orderItems: [] })).toThrow(HttpError)
  })

  it('products/orders/orderItems 非陣列時擲出 400', () => {
    expect(() => validateBackup({ exportedAt: 'x', products: {}, orders: [], orderItems: [] })).toThrow(HttpError)
  })

  it('product 缺 name/price 或 id 非正整數時擲出 400', () => {
    expect(() => validateBackup(makeBackup([{ id: '1', price: 10 }]))).toThrow(HttpError)
    expect(() => validateBackup(makeBackup([{ id: '1', name: 'A' }]))).toThrow(HttpError)
    expect(() => validateBackup(makeBackup([{ id: 'abc', name: 'A', price: 10 }]))).toThrow(HttpError)
    expect(() => validateBackup(makeBackup([{ id: 0, name: 'A', price: 10 }]))).toThrow(HttpError)
  })

  it('order 缺 total 或 payment_method 時擲出 400', () => {
    expect(() => validateBackup(makeBackup([], [{ id: '1', total: 10 }]))).toThrow(HttpError)
    expect(() => validateBackup(makeBackup([], [{ id: '1', payment_method: 'cash' }]))).toThrow(HttpError)
  })

  it('orderItem 缺 order_id/product_id/quantity 時擲出 400', () => {
    expect(() => validateBackup(makeBackup([], [], [{ id: '1', product_id: '1', quantity: 1, unit_price: 1, subtotal: 1 }]))).toThrow(HttpError)
    expect(() => validateBackup(makeBackup([], [], [{ id: '1', order_id: '1', quantity: 1, unit_price: 1, subtotal: 1 }]))).toThrow(HttpError)
    expect(() => validateBackup(makeBackup([], [], [{ id: '1', order_id: '1', product_id: '1', unit_price: 1, subtotal: 1 }]))).toThrow(HttpError)
  })

  it('接受匯出格式的字串 id（BIGSERIAL）與數字 id', () => {
    const backup = makeBackup(
      [{ id: '7', name: 'A', price: 10 }],
      [{ id: '8', total: 10, payment_method: 'cash' }],
      [{ id: '9', order_id: '8', product_id: '7', quantity: 1, unit_price: 10, subtotal: 10 }],
    )
    expect(validateBackup(backup)).toMatchObject({ products: [{ id: '7' }] })
  })
})

describe('databaseImportService replace 模式', () => {
  it('TRUNCATE 後依序插入並保留原始 id，單一 COMMIT', async () => {
    const { calls, service } = makeHarness()
    const summary = await service.importBackup(
      'replace',
      makeBackup(
        [{ id: '7', name: 'A', price: 10, barcode: 'BC1', stock: 2 }],
        [{ id: '8', total: 10, tax: 0, discount: 0, payment_method: 'cash', status: 'completed' }],
        [{ id: '9', order_id: '8', product_id: '7', quantity: 1, unit_price: 10, subtotal: 10 }],
      ),
    )

    expect(summary).toEqual({ products: 1, orders: 1, orderItems: 1 })

    const texts = calls.map((c) => c.text)
    expect(texts[0]).toContain('TRUNCATE products, orders, order_items RESTART IDENTITY CASCADE')

    const productInsert = calls.find((c) => c.text.startsWith('INSERT INTO products'))
    expect(productInsert?.params?.[0]).toBe('7')
    expect(productInsert?.params?.[1]).toBe('A')
    expect(productInsert?.params?.[3]).toBe('BC1')
    expect(productInsert?.params?.[5]).toBe(2)
    expect(productInsert?.text).not.toContain('ON CONFLICT')

    const orderInsert = calls.find((c) => c.text.startsWith('INSERT INTO orders'))
    expect(orderInsert?.params?.[0]).toBe('8')

    const itemInsert = calls.find((c) => c.text.startsWith('INSERT INTO order_items'))
    expect(itemInsert?.params?.[2]).toBe('7')

    expect(texts.some((t) => t.includes('setval'))).toBe(true)
    expect(calls.filter((c) => c.text === 'COMMIT')).toHaveLength(1)
    expect(calls.filter((c) => c.text === 'ROLLBACK')).toHaveLength(0)
  })
})

describe('databaseImportService merge 模式', () => {
  it('不做 TRUNCATE，以 ON CONFLICT (id) DO UPDATE upsert', async () => {
    const { calls, service } = makeHarness()
    await service.importBackup(
      'merge',
      makeBackup(
        [{ id: '7', name: 'A', price: 10 }],
        [{ id: '8', total: 10, payment_method: 'cash' }],
        [{ id: '9', order_id: '8', product_id: '7', quantity: 1, unit_price: 10, subtotal: 10 }],
      ),
    )

    const texts = calls.map((c) => c.text)
    expect(texts.some((t) => t.includes('TRUNCATE'))).toBe(false)

    const productInsert = calls.find((c) => c.text.startsWith('INSERT INTO products'))
    expect(productInsert?.text).toContain('ON CONFLICT (id) DO UPDATE SET')

    const orderInsert = calls.find((c) => c.text.startsWith('INSERT INTO orders'))
    expect(orderInsert?.text).toContain('ON CONFLICT (id) DO UPDATE SET')

    const itemInsert = calls.find((c) => c.text.startsWith('INSERT INTO order_items'))
    expect(itemInsert?.text).toContain('ON CONFLICT (id) DO UPDATE SET')

    expect(calls.filter((c) => c.text === 'COMMIT')).toHaveLength(1)
    expect(calls.filter((c) => c.text === 'ROLLBACK')).toHaveLength(0)
  })
})

describe('databaseImportService 引用完整性', () => {
  it('merge 遇到 order_items 引用不存在的 product 時拋 400', async () => {
    const { calls, service } = makeHarness()
    const backup = makeBackup(
      [{ id: '1', name: 'A', price: 10 }],
      [{ id: '2', total: 10, payment_method: 'cash' }],
      [{ id: '3', order_id: '2', product_id: '99', quantity: 1, unit_price: 10, subtotal: 10 }],
    )

    await expectHttpError(service.importBackup('merge', backup), 400)
    expect(calls.map((c) => c.text)).toContain('ROLLBACK')
  })

  it('replace 遇到 order_items 引用不存在的 order 時拋 400', async () => {
    const { calls, service } = makeHarness()
    const backup = makeBackup(
      [{ id: '1', name: 'A', price: 10 }],
      [],
      [{ id: '3', order_id: '2', product_id: '1', quantity: 1, unit_price: 10, subtotal: 10 }],
    )

    await expectHttpError(service.importBackup('replace', backup), 400)
    expect(calls.map((c) => c.text)).toContain('ROLLBACK')
  })

  it('replace 模式不查詢 DB，純 JS 比對即攔截懸空引用（DB 已 TRUNCATE）', async () => {
    const { calls, service } = makeHarness({
      'FROM products WHERE id = ANY': [{ id: '99' }],
    })
    const backup = makeBackup(
      [],
      [{ id: '2', total: 10, payment_method: 'cash' }],
      [{ id: '3', order_id: '2', product_id: '99', quantity: 1, unit_price: 10, subtotal: 10 }],
    )

    await expectHttpError(service.importBackup('replace', backup), 400)

    expect(calls.filter((c) => c.text.includes('ANY($1::bigint[])'))).toHaveLength(0)
  })

  it('merge 當被引用 id 已存在於現有 DB 時引用檢查通過', async () => {
    const { calls, service } = makeHarness({
      'FROM products WHERE id = ANY': [{ id: '99' }],
    })
    const backup = makeBackup(
      [],
      [{ id: '2', total: 10, payment_method: 'cash' }],
      [{ id: '3', order_id: '2', product_id: '99', quantity: 1, unit_price: 10, subtotal: 10 }],
    )

    const summary = await service.importBackup('merge', backup)

    expect(summary).toEqual({ products: 0, orders: 1, orderItems: 1 })
    expect(calls.filter((c) => c.text === 'ROLLBACK')).toHaveLength(0)
  })

  it('merge 自帶完整參照的備份不額外發查詢，直接寫入', async () => {
    const { calls, service } = makeHarness()
    const backup = makeBackup(
      [{ id: '7', name: 'A', price: 10 }],
      [{ id: '8', total: 10, payment_method: 'cash' }],
      [{ id: '9', order_id: '8', product_id: '7', quantity: 1, unit_price: 10, subtotal: 10 }],
    )

    await service.importBackup('merge', backup)

    const withAny = calls.filter((c) => c.text.includes('ANY($1::bigint[])'))
    expect(withAny).toHaveLength(0)
  })
})

describe('databaseImportService 交易整體性', () => {
  it('任一步失敗即 ROLLBACK，不回寫', async () => {
    const { calls, service, failOnNext } = makeHarness()
    failOnNext('INSERT INTO order_items')

    await expect(
      service.importBackup(
        'replace',
        makeBackup(
          [{ id: '7', name: 'A', price: 10 }],
          [{ id: '8', total: 10, payment_method: 'cash' }],
          [{ id: '9', order_id: '8', product_id: '7', quantity: 1, unit_price: 10, subtotal: 10 }],
        ),
      ),
    ).rejects.toThrow('db boom')

    const texts = calls.map((c) => c.text)
    expect(texts).toContain('ROLLBACK')
    expect(calls.filter((c) => c.text === 'COMMIT')).toHaveLength(0)
  })
})