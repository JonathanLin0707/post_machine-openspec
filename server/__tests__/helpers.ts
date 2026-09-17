export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/postgres'

export function setDatabaseUrl(url: string = TEST_DATABASE_URL): void {
  process.env.DATABASE_URL = url
}

export async function probeDatabase(): Promise<boolean> {
  setDatabaseUrl()
  try {
    const { checkConnection } = await import('../src/db/pool.js')
    await checkConnection()
    return true
  } catch {
    return false
  }
}

export async function initTestDatabase(): Promise<void> {
  setDatabaseUrl()
  const { initDatabase } = await import('../src/database.js')
  await initDatabase()
}

export async function resetDatabase(): Promise<void> {
  const { query } = await import('../src/database.js')
  await query('TRUNCATE TABLE products, orders, order_items RESTART IDENTITY CASCADE')
}

export async function seedProduct(
  name: string,
  price: number,
  stock = 100,
  category: string | null = null,
  barcode: string | null = null,
): Promise<number> {
  const { query } = await import('../src/database.js')
  const result = await query<{ id: number }>(
    `INSERT INTO products (name, price, stock, category, barcode)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [name, price, stock, category, barcode],
  )
  return Number(result.rows[0].id)
}

export async function seedOrder(
  paymentMethod: string,
  items: { productId: number; quantity: number; unitPrice: number }[],
  discount = 0,
): Promise<void> {
  const { query } = await import('../src/database.js')
  const subtotal = items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0)
  const total = subtotal - discount
  const result = await query<{ id: number }>(
    `INSERT INTO orders (total, discount, tax, payment_method, status)
     VALUES ($1, $2, 0, $3, 'completed') RETURNING id`,
    [total, discount, paymentMethod],
  )
  const orderId = Number(result.rows[0].id)
  for (const it of items) {
    await query(
      `INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
       VALUES ($1, $2, $3, $4, $5)`,
      [orderId, it.productId, it.quantity, it.unitPrice, it.unitPrice * it.quantity],
    )
  }
}

export async function closeTestDatabase(): Promise<void> {
  const { pool } = await import('../src/db/pool.js')
  try {
    await pool.end()
  } catch {
    // pool already ended (e.g. by a failure-injection test)
  }
}