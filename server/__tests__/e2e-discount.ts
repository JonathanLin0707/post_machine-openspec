import path from 'path'
import os from 'os'
import fs from 'fs'

// Set DB path BEFORE importing route modules (they init at load time)
const tmpDb = path.join(os.tmpdir(), `e2e-discount-${process.pid}-${Date.now()}.db`)
if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb)
process.env.DATABASE_PATH = tmpDb

import express from 'express'
import app from '../src/routes/products.js'
import ordersApp from '../src/routes/orders.js'
import reportsApp from '../src/routes/reports.js'

// Build a router that mounts the route handlers, but never binds a socket.
const testRouter = express.Router()
testRouter.use('/api/products', app as never)
testRouter.use('/api/orders', ordersApp as never)
testRouter.use('/api/reports', reportsApp as never)

let failures = 0
function assert(cond: boolean, msg: string) {
  if (cond) console.log('  PASS:', msg)
  else { console.error('  FAIL:', msg); failures++ }
}

// Minimal request runner that drives the router without a listening socket.
async function run() {
  const request = (url: string, body?: unknown) =>
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

  console.log('=== Discount end-to-end verification ===')

  // Seed a product with stock
  const seed = await request(`${base}/api/products`, { name: `E2E-${process.pid}`, price: 100, category: 'test', stock: 10 })
  if (!seed.ok) { console.error('Seed failed:', seed.status, await seed.text()); process.exit(1) }
  const productId = String((await seed.json()).id)

  // Create order with subtotal 200 (qty 2 @ 100) and discount 50 -> total should be 150
  const res = await request(`${base}/api/orders`, { items: [{ productId, quantity: 2 }], discount: 50, payment_method: 'cash' })
  console.log('Create order status:', res.status)
  const order = await res.json()
  assert(res.status === 201, 'order created with 201')
  assert(order.total === 150, `total is discounted (got ${order.total}, expected 150)`)
  assert(order.discount === 50, `discount persisted on create (got ${order.discount})`)

  // Fetch the order back by ID and confirm total/discount persisted
  const fetchRes = await fetch(`${base}/api/orders/${order.id}`)
  const fetchedOrder = await fetchRes.json()
  console.log('Fetched order:', JSON.stringify(fetchedOrder))
  assert(fetchRes.status === 200, 'fetch order returns 200')
  assert(fetchedOrder.total === 150, `fetched total is discounted (got ${fetchedOrder.total})`)
  assert(fetchedOrder.discount === 50, `fetched discount persisted (got ${fetchedOrder.discount})`)

  // Force created_at to today so it shows in the report window
  const db = (await import('better-sqlite3')).default(tmpDb)
  db.exec("UPDATE orders SET created_at = datetime('now') WHERE id = ?", [order.id])
  db.close()

  const dailyRes2 = await fetch(`${base}/api/reports/daily`)
  const todaySummary = dailyRes2.body.today || {}
  console.log('Today summary:', JSON.stringify(todaySummary))
  assert(todaySummary.total_sales === 150, `today total_sales reflects discount (got ${todaySummary.total_sales}, expected 150)`)

  // Reject discount exceeding subtotal with 400
  const badOrder = await request(`${base}/api/orders`, { items: [{ productId, quantity: 1 }], discount: 150, payment_method: 'cash' })
  console.log('Bad order status:', badOrder.status)
  assert(badOrder.status === 400, 'discount exceeding subtotal returns 400')

  fs.unlinkSync(tmpDb)

  if (failures === 0) {
    console.log('\nAll end-to-end checks passed!')
    process.exit(0)
  } else {
    console.error(`\n${failures} check(s) failed`)
    process.exit(1)
  }
}

run().catch(err => { console.error(err); process.exit(1) })
