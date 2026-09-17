import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import path from 'path'
import fs from 'fs'
import Database from 'better-sqlite3'
import type { OrderExport } from 'shared'
import type { CsvExportService as CsvExportServiceType } from '../src/services/csvExportService.js'

const tmpDb = path.join(process.env.TMPDIR || process.cwd(), 'csv-export-service-test.db')
for (const f of [tmpDb, tmpDb + '-wal', tmpDb + '-shm']) {
  try {
    if (fs.existsSync(f)) fs.unlinkSync(f)
  } catch {
    /* ignore */
  }
}
process.env.DATABASE_PATH = tmpDb

let db: Database.Database
let service: CsvExportServiceType

beforeAll(async () => {
  const { initDatabase } = await import('../src/database.js')
  initDatabase()
  const { CsvExportService } = await import('../src/services/csvExportService.js')
  service = new CsvExportService()

  db = new Database(tmpDb)
  const prodId = db.prepare('INSERT INTO products (name, price, stock) VALUES (?, ?, 100)')
  const p1 = Number(prodId.run('豆漿', 30).lastInsertRowid)
  const p2 = Number(prodId.run('Milk, 2%', 45).lastInsertRowid)

  const ord = db.prepare("INSERT INTO orders (total, discount, tax, payment_method, status) VALUES (?, ?, 0, ?, 'completed')")
  const o1 = Number(ord.run(105, 15, 'cash').lastInsertRowid)
  const o2 = Number(ord.run(45, 0, 'credit_card').lastInsertRowid)

  const item = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)')
  item.run(o1, p1, 2, 30, 60)
  item.run(o1, p2, 1, 45, 45)
  item.run(o2, p2, 1, 45, 45)
})

afterAll(async () => {
  try {
    db.close()
  } catch {
    /* ignore */
  }
  try {
    const dbMod = await import('../src/database.js')
    ;(dbMod as { getDb: () => { close: () => void } }).getDb().close()
  } catch {
    /* ignore */
  }
  for (const f of [tmpDb, tmpDb + '-wal', tmpDb + '-shm']) {
    try {
      if (fs.existsSync(f)) fs.unlinkSync(f)
    } catch {
      /* ignore */
    }
  }
})

describe('CsvExportService.fetchAllOrders', () => {
  it('returns one record per order with grouped item lines', async () => {
    const orders = await service.fetchAllOrders()
    expect(orders).toHaveLength(2)

    expect(orders[0].total).toBe(105)
    expect(orders[0].discount).toBe(15)
    expect(orders[0].paymentMethod).toBe('cash')
    expect(orders[0].items).toContain('豆漿 (2)')
    expect(orders[0].items).toContain('Milk, 2% (1)')
    expect(orders[0].datetime).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)

    expect(orders[1].paymentMethod).toBe('credit_card')
    expect(orders[1].discount).toBe(0)
    expect(orders[1].items).toContain('Milk, 2% (1)')
  })
})

describe('CsvExportService.formatAsCSV', () => {
  it('prepends a UTF-8 BOM and a single header row for empty input', () => {
    const csv = service.formatAsCSV([])
    expect(csv.startsWith('\uFEFFOrder ID,Date/Time,Items,Total Amount,Discount,Payment Method')).toBe(true)
    expect(csv.replace('\uFEFF', '').split(/\r?\n/)).toHaveLength(1)
  })

  it('formats ISO datetime, 2-decimal totals, and quotes/escapes cells', () => {
    const orders: OrderExport[] = [
      { id: '1', datetime: '2026-09-17 10:30:00', items: '豆漿 (2), Milk, 2% (1)', total: 105, discount: 15, paymentMethod: 'cash' },
      { id: '2', datetime: '2026-09-17 11:45:00', items: 'Snack "Large" (1)', total: 45, discount: 0, paymentMethod: 'credit_card' },
    ]
    const csv = service.formatAsCSV(orders)
    const lines = csv.replace('\uFEFF', '').split('\r\n')

    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(lines).toHaveLength(3)
    expect(lines[0]).toBe('Order ID,Date/Time,Items,Total Amount,Discount,Payment Method')
    expect(lines[1]).toBe('1,2026-09-17T10:30:00,"豆漿 (2), Milk, 2% (1)",105.00,15.00,cash')
    expect(lines[2]).toBe('2,2026-09-17T11:45:00,"Snack ""Large"" (1)",45.00,0.00,credit_card')
  })
})