import type { PoolClient } from 'pg'
import { pool } from './db/pool.js'

export interface QueryResultLike<T = unknown> {
  rows: T[]
  rowCount: number
}

export interface Queryable {
  query<T = unknown>(text: string, params?: unknown[]): Promise<QueryResultLike<T>>
}

function asQueryable(client: PoolClient): Queryable {
  return {
    async query<T = unknown>(
      text: string,
      params: unknown[] = [],
    ): Promise<QueryResultLike<T>> {
      const result = await client.query(text, params)
      return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 }
    },
  }
}

const SCHEMA_LOCK_KEY = 42_763_390 // arbitrary app-wide key for schema init

async function runStatements(
  client: PoolClient,
  statements: string[],
): Promise<void> {
  try {
    await client.query('BEGIN')
    for (const statement of statements) {
      await client.query(statement)
    }
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  }
}

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    price DOUBLE PRECISION NOT NULL,
    barcode TEXT UNIQUE,
    category TEXT,
    stock INTEGER NOT NULL DEFAULT 0,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    total DOUBLE PRECISION NOT NULL,
    tax DOUBLE PRECISION NOT NULL DEFAULT 0,
    discount DOUBLE PRECISION NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT now()
  )`,
  // Add discount column to existing orders tables (migration for pre-existing DBs)
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount DOUBLE PRECISION NOT NULL DEFAULT 0`,
  `CREATE TABLE IF NOT EXISTS order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DOUBLE PRECISION NOT NULL,
    subtotal DOUBLE PRECISION NOT NULL,
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)`,
  `CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)`,
]

export async function initDatabase(): Promise<void> {
  const client = await pool.connect()
  try {
    // Serialize schema DDL across all workers/instances: concurrent CREATE
    // statements from parallel processes race the pg catalog and can fail.
    await client.query('SELECT pg_advisory_lock($1)', [SCHEMA_LOCK_KEY])
    try {
      await runStatements(client, SCHEMA_STATEMENTS)
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [SCHEMA_LOCK_KEY])
    }
  } finally {
    client.release()
  }
  console.log('Database initialized successfully')
}

export async function query<T = unknown>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResultLike<T>> {
  const result = await pool.query(text, params)
  return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 }
}

export async function withTransaction<T>(
  fn: (tx: Queryable) => Promise<T>,
): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(asQueryable(client))
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}