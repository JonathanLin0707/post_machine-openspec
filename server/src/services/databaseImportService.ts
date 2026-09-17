import { withTransaction, type Queryable } from '../database.js'

export type ImportMode = 'replace' | 'merge'

export interface ImportSummary {
  products: number
  orders: number
  orderItems: number
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'HttpError'
  }
}

type JsonRow = Record<string, unknown>

export interface Backup {
  exportedAt: string
  products: JsonRow[]
  orders: JsonRow[]
  orderItems: JsonRow[]
}

function isPlainObject(value: unknown): value is JsonRow {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asId(value: unknown): number | string {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value
  }
  if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) {
    return value
  }
  throw new HttpError(400, '每筆資料必須包含正整數 id')
}

function requireString(row: JsonRow, key: string): string {
  const value = row[key]
  if (typeof value !== 'string' || value === '') {
    throw new HttpError(400, `欄位 ${key} 必須為非空字串`)
  }
  return value
}

function requireNumber(row: JsonRow, key: string): number {
  const value = row[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new HttpError(400, `欄位 ${key} 必須為數字`)
  }
  return value
}

function optionalString(row: JsonRow, key: string): string | null {
  const value = row[key]
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  throw new HttpError(400, `欄位 ${key} 型別錯誤`)
}

function optionalNumber(row: JsonRow, key: string): number | null {
  const value = row[key]
  if (value === null || value === undefined) return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Number(value)
  }
  throw new HttpError(400, `欄位 ${key} 型別錯誤`)
}

function optionalTimestamp(row: JsonRow, key: string): string {
  const value = row[key]
  if (typeof value === 'string') return value
  return new Date().toISOString()
}

export function validateBackup(raw: unknown): Backup {
  if (!isPlainObject(raw)) {
    throw new HttpError(400, '無效的備份格式：必須包含 exportedAt、products、orders、orderItems')
  }
  if (typeof raw.exportedAt !== 'string') {
    throw new HttpError(400, '欄位 exportedAt 必須為字串')
  }

  const products = raw.products
  const orders = raw.orders
  const orderItems = raw.orderItems
  if (!Array.isArray(products) || !Array.isArray(orders) || !Array.isArray(orderItems)) {
    throw new HttpError(400, '欄位 products、orders、orderItems 必須為陣列')
  }

  for (const row of products) {
    if (!isPlainObject(row)) {
      throw new HttpError(400, 'products 資料列必須為物件')
    }
    asId(row.id)
    requireString(row, 'name')
    requireNumber(row, 'price')
  }
  for (const row of orders) {
    if (!isPlainObject(row)) {
      throw new HttpError(400, 'orders 資料列必須為物件')
    }
    asId(row.id)
    requireNumber(row, 'total')
    requireString(row, 'payment_method')
  }
  for (const row of orderItems) {
    if (!isPlainObject(row)) {
      throw new HttpError(400, 'orderItems 資料列必須為物件')
    }
    asId(row.id)
    asId(row.order_id)
    asId(row.product_id)
    requireNumber(row, 'quantity')
    requireNumber(row, 'unit_price')
    requireNumber(row, 'subtotal')
  }

  return {
    exportedAt: raw.exportedAt,
    products: products as JsonRow[],
    orders: orders as JsonRow[],
    orderItems: orderItems as JsonRow[],
  }
}

const PRODUCT_COLUMNS = ['id', 'name', 'price', 'barcode', 'category', 'stock', 'image_url', 'created_at', 'updated_at']
const ORDER_COLUMNS = ['id', 'total', 'tax', 'discount', 'payment_method', 'status', 'created_at']
const ORDER_ITEM_COLUMNS = ['id', 'order_id', 'product_id', 'quantity', 'unit_price', 'subtotal']

function productParams(row: JsonRow): unknown[] {
  return [
    asId(row.id),
    requireString(row, 'name'),
    requireNumber(row, 'price'),
    optionalString(row, 'barcode'),
    optionalString(row, 'category'),
    optionalNumber(row, 'stock') ?? 0,
    optionalString(row, 'image_url'),
    optionalTimestamp(row, 'created_at'),
    optionalTimestamp(row, 'updated_at'),
  ]
}

function orderParams(row: JsonRow): unknown[] {
  return [
    asId(row.id),
    requireNumber(row, 'total'),
    optionalNumber(row, 'tax') ?? 0,
    optionalNumber(row, 'discount') ?? 0,
    requireString(row, 'payment_method'),
    optionalString(row, 'status') ?? 'completed',
    optionalTimestamp(row, 'created_at'),
  ]
}

function orderItemParams(row: JsonRow): unknown[] {
  return [
    asId(row.id),
    asId(row.order_id),
    asId(row.product_id),
    requireNumber(row, 'quantity'),
    requireNumber(row, 'unit_price'),
    requireNumber(row, 'subtotal'),
  ]
}

function conflictSuffix(columns: string[], exclude: string[] = []): string {
  const updatable = columns.filter((col) => col !== 'id' && !exclude.includes(col))
  const sets = updatable.map((col) => `${col} = EXCLUDED.${col}`).join(', ')
  return ` ON CONFLICT (id) DO UPDATE SET ${sets}`
}

const INSERT_PRODUCT_SQL = `INSERT INTO products (${PRODUCT_COLUMNS.join(', ')}) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`
const INSERT_ORDER_SQL = `INSERT INTO orders (${ORDER_COLUMNS.join(', ')}) VALUES ($1, $2, $3, $4, $5, $6, $7)`
const INSERT_ORDER_ITEM_SQL = `INSERT INTO order_items (${ORDER_ITEM_COLUMNS.join(', ')}) VALUES ($1, $2, $3, $4, $5, $6)`

const UPSERT_PRODUCT_SQL = INSERT_PRODUCT_SQL + conflictSuffix(PRODUCT_COLUMNS, ['created_at'])
const UPSERT_ORDER_SQL = INSERT_ORDER_SQL + conflictSuffix(ORDER_COLUMNS, ['created_at'])
const UPSERT_ORDER_ITEM_SQL = INSERT_ORDER_ITEM_SQL + conflictSuffix(ORDER_ITEM_COLUMNS)

/** @internal Hardcoded table names — do not expose as public API. */
const RESYNC_SQL = (table: string) =>
  `SELECT setval(pg_get_serial_sequence('${table}', 'id'), GREATEST(COALESCE(MAX(id), 0), 1)) FROM ${table}`

async function resyncSequences(tx: Queryable): Promise<void> {
  await tx.query(RESYNC_SQL('products'))
  await tx.query(RESYNC_SQL('orders'))
  await tx.query(RESYNC_SQL('order_items'))
}

export type TransactionRunner = (
  fn: (tx: Queryable) => Promise<unknown>,
) => Promise<unknown>

/**
 * Imports a full JSON database backup into PostgreSQL inside a single
 * transaction. All database access goes through the injected Queryable so
 * tests can substitute a failing data layer.
 */
export class DatabaseImportService {
  private readonly runner: TransactionRunner

  constructor(runner: TransactionRunner = withTransaction) {
    this.runner = runner
  }

  async importBackup(rawMode: unknown, rawBackup: unknown): Promise<ImportSummary> {
    if (rawMode !== 'replace' && rawMode !== 'merge') {
      throw new HttpError(400, 'mode 必須為 replace 或 merge')
    }
    const mode: ImportMode = rawMode
    const backup = validateBackup(rawBackup)

    const summary = await this.runner(async (tx) => {
      if (mode === 'replace') {
        await tx.query('TRUNCATE products, orders, order_items RESTART IDENTITY CASCADE')
      }

      const productSql = mode === 'merge' ? UPSERT_PRODUCT_SQL : INSERT_PRODUCT_SQL
      const orderSql = mode === 'merge' ? UPSERT_ORDER_SQL : INSERT_ORDER_SQL
      const orderItemSql = mode === 'merge' ? UPSERT_ORDER_ITEM_SQL : INSERT_ORDER_ITEM_SQL

      for (const row of backup.products) {
        await tx.query(productSql, productParams(row))
      }
      for (const row of backup.orders) {
        await tx.query(orderSql, orderParams(row))
      }
      for (const row of backup.orderItems) {
        await tx.query(orderItemSql, orderItemParams(row))
      }

      await resyncSequences(tx)

      return {
        products: backup.products.length,
        orders: backup.orders.length,
        orderItems: backup.orderItems.length,
      }
    })

    return summary as ImportSummary
  }
}