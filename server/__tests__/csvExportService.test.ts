import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { OrderExport } from 'shared'
import type { CsvExportService as CsvExportServiceType } from '../src/services/csvExportService.js'
import {
  closeTestDatabase,
  initTestDatabase,
  probeDatabase,
  resetDatabase,
  seedProduct,
} from './helpers.js'

const available = await probeDatabase()
const describeOk = available ? describe : describe.skip
const beforeAllOk = available ? beforeAll : () => {}
const afterAllOk = available ? afterAll : () => {}

let service: CsvExportServiceType

beforeAllOk(async () => {
  await initTestDatabase()
  await resetDatabase()

  const p1 = await seedProduct('豆漿', 30)
  const p2 = await seedProduct('Milk, 2%', 45)

  // Seed explicit order values (total/discount are independent in stored data)
  const { query } = await import('../src/database.js')
  const o1 = await query<{ id: number }>(
    `INSERT INTO orders (total, discount, tax, payment_method, status)
     VALUES ($1, $2, 0, 'cash', 'completed') RETURNING id`,
    [105, 15],
  )
  const o2 = await query<{ id: number }>(
    `INSERT INTO orders (total, discount, tax, payment_method, status)
     VALUES ($1, $2, 0, 'credit_card', 'completed') RETURNING id`,
    [45, 0],
  )
  await query(
    'INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES ($1, $2, $3, $4, $5)',
    [o1.rows[0].id, p1, 2, 30, 60],
  )
  await query(
    'INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES ($1, $2, $3, $4, $5)',
    [o1.rows[0].id, p2, 1, 45, 45],
  )
  await query(
    'INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES ($1, $2, $3, $4, $5)',
    [o2.rows[0].id, p2, 1, 45, 45],
  )

  const { CsvExportService } = await import('../src/services/csvExportService.js')
  service = new CsvExportService()
})

afterAllOk(async () => {
  await closeTestDatabase()
})

describeOk('CsvExportService.fetchAllOrders', () => {
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

describeOk('CsvExportService.formatAsCSV', () => {
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