import { Router, Request, Response } from 'express'
import { getDb } from '../database'

const router = Router()

// POST /api/orders - Create new order
router.post('/', (req: Request, res: Response) => {
  const db = getDb()
  const { items, payment_method } = req.body

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order items are required' })
  }

  if (!payment_method || !['cash', 'credit_card', 'mobile_payment'].includes(payment_method)) {
    return res.status(400).json({ error: 'Invalid payment method' })
  }

  // Validate and deduct stock for each item
  let total = 0
  const orderItems: any[] = []

  for (const item of items) {
    try {
      const data = db.exec(`SELECT * FROM products WHERE id = ?`, [item.productId])
      if (!data.length || !data[0].values || data[0].values.length === 0) {
        return res.status(404).json({ error: `Product ${item.productId} not found` })
      }

      const row = data[0].values[0]

      const product = {
        id: row[0],
        name: row[1],
        price: Number(row[2]),
        stock: Number(row[5]),
        category: row[4],
      }

      console.log(product);


      if (product.stock < item.quantity) {
        return res.status(400).json({
          error: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`
        })
      }

      const subtotal = product.price * item.quantity
      total += subtotal

      console.log(`Deducting stock for product ${product.id}: ${item.quantity} units`)
      // Deduct stock
      db.run('UPDATE products SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [item.quantity, item.productId])

      orderItems.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        subtotal,
      })
    } catch (error) {
      console.error(`Error processing item ${item.productId}:`, error)
      return res.status(500).json({ error: `Failed to process item ${item.productId}` })
    }
  }

  const tax = total * 0.1
  const grandTotal = total + tax

  // Create order
  try {
    console.log(`Creating order with total: ${grandTotal}, tax: ${tax}, payment method: ${payment_method}`)
    db.run(
      `INSERT INTO orders (total, tax, payment_method, status) 
       VALUES (?, ?, ?, 'completed')`,
      [grandTotal, tax, payment_method]
    )

    const result = db.exec(`
      SELECT last_insert_rowid() AS id
    `)

    if (!result.length || !result[0].values.length) {
      throw new Error('Failed to get order ID')
    }

    const orderId = result[0].values[0][0]

    console.log(`Order created with ID: ${orderId}`)

    // Insert order items
    for (const item of orderItems) {
      console.log(`Inserting order item for order ${orderId}: product ${item.productId}, quantity ${item.quantity}`)
      db.run(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) 
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, item.productId, item.quantity, item.price, item.subtotal]
      )
    }

    // Get full order with items
    console.log(`Fetching full order details for order ${orderId}`)
    const data = db.exec(`
      SELECT o.*, json_group_array(json_object(
        'id', oi.id,
        'productId', oi.product_id,
        'name', p.name,
        'quantity', oi.quantity,
        'unitPrice', oi.unit_price,
        'subtotal', oi.subtotal
      )) as items_json
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.id = ?
    `, [orderId])

    if (data.length > 0 && data[0].values && data[0].values.length > 0) {
      const row = data[0].values[0]
      res.status(201).json({
        id: row[0],
        total: row[1],
        tax: row[2],
        payment_method: row[3],
        status: row[4],
        created_at: row[5],
        items_json: row[6] || []
      })
    } else {
      res.status(500).json({ error: 'Failed to create order' })
    }
  } catch (error) {
    console.error('Error creating order:', error)
    res.status(500).json({ error: 'Failed to create order' })
  }
})

// GET /api/orders - Get all orders
router.get('/', (req: Request, res: Response) => {
  const db = getDb()

  try {
    const data = db.exec(`
      SELECT o.*, json_group_array(json_object(
        'id', oi.id,
        'productId', oi.product_id,
        'name', p.name,
        'quantity', oi.quantity,
        'unitPrice', oi.unit_price,
        'subtotal', oi.subtotal
      )) as items_json
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `)

    const orders: any[] = []
    if (data.length > 0 && data[0].values) {
      for (const row of data[0].values) {
        orders.push({
          id: row[0],
          total: row[1],
          tax: row[2],
          payment_method: row[3],
          status: row[4],
          created_at: row[5],
          items_json: row[6] || []
        })
      }
    }

    res.json(orders)
  } catch (error) {
    console.error('Error fetching orders:', error)
    res.status(500).json({ error: 'Failed to fetch orders' })
  }
})

// GET /api/orders/:id - Get single order with items
router.get('/:id', (req: Request, res: Response) => {
  const db = getDb()

  try {
    const data = db.exec(`
      SELECT o.*, json_group_array(json_object(
        'id', oi.id,
        'productId', oi.product_id,
        'name', p.name,
        'quantity', oi.quantity,
        'unitPrice', oi.unit_price,
        'subtotal', oi.subtotal
      )) as items_json
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.id = ?
    `, [req.params.id])

    if (data.length > 0 && data[0].values && data[0].values.length > 0) {
      const row = data[0].values[0]
      res.json({
        id: row[0],
        total: row[1],
        tax: row[2],
        payment_method: row[3],
        status: row[4],
        created_at: row[5],
        items_json: row[6] || []
      })
    } else {
      res.status(404).json({ error: 'Order not found' })
    }
  } catch (error) {
    console.error('Error fetching order:', error)
    res.status(500).json({ error: 'Failed to fetch order' })
  }
})

export default router
