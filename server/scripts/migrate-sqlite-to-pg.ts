import Database from 'better-sqlite3'
import path from 'path'
import { initDatabase, query } from '../src/database.js'
import { checkConnection, pool } from '../src/db/pool.js'

interface SqliteProductRow {
  id: number
  name: string
  price: number
  barcode: string | null
  category: string | null
  stock: number
  image_url: string | null
  created_at: string | null
  updated_at: string | null
}

interface SqliteOrderRow {
  id: number
  total: number
  tax: number
  discount: number | null
  payment_method: string
  status: string
  created_at: string | null
}

interface SqliteOrderItemRow {
  id: number
  order_id: number
  product_id: number
  quantity: number
  unit_price: number
  subtotal: number
}

// SQLite stores UTC as 'YYYY-MM-DD HH:MM:SS'; convert to a tz-aware form
function toUtc(value: string | null): string | null {
  if (!value) return null
  return value.replace(' ', 'T') + 'Z'
}

function assertDatabaseUrl(): void {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error(
      'DATABASE_URL is not set.\n' +
        'Set it in the SAME shell session as this command, e.g.\n' +
        '  PowerShell:  $env:DATABASE_URL="postgresql://user:password@host:5432/db"\n' +
        'or create server/.env containing DATABASE_URL=... (read automatically).',
    )
    process.exit(1)
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    console.error(
      `DATABASE_URL is not a valid URL: "${url}"\n` +
        'Expected format: postgresql://<user>:<password>@<host>:<port>/<database>',
    )
    process.exit(1)
  }

  if (!parsed.password) {
    console.error(
      'DATABASE_URL is missing a password.\n' +
        'The error "SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string" ' +
        'means PostgreSQL required a password but none was provided.\n' +
        `Received: postgresql://${parsed.username || '<no-user>'}:<no-password>@${parsed.host}/${parsed.pathname.replace(/^\//, '')}\n` +
        'Checks:\n' +
        '  1. The env var must be set in the same shell session that runs this command.\n' +
        '  2. Quote the whole URL in PowerShell (double quotes).\n' +
        '  3. URL-encode special characters in the password (e.g. @ -> %40, : -> %3A, # -> %23, / -> %2F).\n' +
        '  4. Or put DATABASE_URL in server/.env and rerun without exporting it.',
    )
    process.exit(1)
  }
}

async function main(): Promise<void> {
  assertDatabaseUrl()
  const sqlitePath =
    process.env.SQLITE_PATH || path.resolve(process.cwd(), 'data/grocery.db')
  const replace = process.argv.includes('--replace')

  console.log(`Reading source SQLite database: ${sqlitePath}`)
  const sqlite = new Database(sqlitePath, { readonly: true })
  const products = sqlite
    .prepare('SELECT * FROM products ORDER BY id')
    .all() as SqliteProductRow[]
  const orders = sqlite
    .prepare('SELECT * FROM orders ORDER BY id')
    .all() as SqliteOrderRow[]
  const orderItems = sqlite
    .prepare('SELECT * FROM order_items ORDER BY id')
    .all() as SqliteOrderItemRow[]
  sqlite.close()

  console.log(
    `Source counts -> products: ${products.length}, orders: ${orders.length}, order_items: ${orderItems.length}`,
  )

  await checkConnection()
  await initDatabase()

  if (replace) {
    console.log('Wiping target tables (--replace)')
    await query('TRUNCATE TABLE products, orders, order_items RESTART IDENTITY CASCADE')
  }

  console.log('Inserting products...')
  for (const row of products) {
    await query(
      `INSERT INTO products (id, name, price, barcode, category, stock, image_url, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        row.id,
        row.name,
        row.price,
        row.barcode,
        row.category,
        row.stock,
        row.image_url,
        toUtc(row.created_at),
        toUtc(row.updated_at),
      ],
    )
  }

  console.log('Inserting orders...')
  for (const row of orders) {
    await query(
      `INSERT INTO orders (id, total, tax, discount, payment_method, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        row.id,
        row.total,
        row.tax,
        row.discount ?? 0,
        row.payment_method,
        row.status,
        toUtc(row.created_at),
      ],
    )
  }

  console.log('Inserting order_items...')
  for (const row of orderItems) {
    await query(
      `INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, subtotal)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [row.id, row.order_id, row.product_id, row.quantity, row.unit_price, row.subtotal],
    )
  }

  // Move identity sequences past the migrated ids
  await query(
    "SELECT setval(pg_get_serial_sequence('products', 'id'), COALESCE((SELECT MAX(id) FROM products), 1))",
  )
  await query(
    "SELECT setval(pg_get_serial_sequence('orders', 'id'), COALESCE((SELECT MAX(id) FROM orders), 1))",
  )
  await query(
    "SELECT setval(pg_get_serial_sequence('order_items', 'id'), COALESCE((SELECT MAX(id) FROM order_items), 1))",
  )

  const targetProducts = await query<{ c: string }>('SELECT COUNT(*) c FROM products')
  const targetOrders = await query<{ c: string }>('SELECT COUNT(*) c FROM orders')
  const targetOrderItems = await query<{ c: string }>('SELECT COUNT(*) c FROM order_items')

  const counts = {
    products: Number(targetProducts.rows[0].c),
    orders: Number(targetOrders.rows[0].c),
    order_items: Number(targetOrderItems.rows[0].c),
  }
  console.log(`Target counts -> products: ${counts.products}, orders: ${counts.orders}, order_items: ${counts.order_items}`)

  await pool.end()

  if (
    counts.products !== products.length ||
    counts.orders !== orders.length ||
    counts.order_items !== orderItems.length
  ) {
    console.error('Count mismatch between source and target!')
    process.exit(1)
  }

  console.log('Migration completed successfully. PostgreSQL is now the single source of truth.')
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})