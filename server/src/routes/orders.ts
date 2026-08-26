import { Router, Request, Response } from 'express'
import { initDatabase, getDb } from '../database.js'

initDatabase()
const db = getDb()

// Prepared statements for orders
const createOrderItems = db.prepare(`INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) 
                                     VALUES (?, ?, ?, ?, ?)`)

const getAllOrdersWithItems = db.prepare(`SELECT o.*, json_group_array(json_object(
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
ORDER BY o.created_at DESC`)

const getOrderByIdWithItems = db.prepare(`SELECT o.*, json_group_array(json_object(
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
WHERE o.id = ?`)

const updateStock = db.prepare('UPDATE products SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')

const getProductById = db.prepare('SELECT * FROM products WHERE id = ?')

const createOrder = db.prepare(`INSERT INTO orders (total, tax, payment_method, status) 
                                VALUES (?, ?, ?, 'completed')`)

interface OrderItem {
  id?: number
  productId: number
  name: string
  quantity: number
  unitPrice: number
  subtotal: number
}

interface Order {
  id: number
  total: number
  tax: number
  payment_method: string
  status: string
  created_at: string
  items_json: OrderItem[]
}

// Removed unused OrderItemInput interface

const router = Router()

// POST /api/orders - Create new order
router.post('/', (req: Request, res: Response) => {
  const { items, payment_method } = req.body

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order items are required' })
  }

  if (!payment_method || !['cash', 'credit_card', 'mobile_payment'].includes(payment_method)) {
    return res.status(400).json({ error: 'Invalid payment method' })
  }

  // Validate and deduct stock for each item
  let total = 0
  const orderItems: OrderItem[] = []

  for (const item of items) {
    try {
      const productRow = getProductById.get([item.productId])
      if (!productRow) {
        return res.status(404).json({ error: `Product ${item.productId} not found` })
      }

      const product = {
        id: Number((productRow as Record<string, unknown>)['id']),
        name: String((productRow as Record<string, unknown>)['name']),
        price: Number((productRow as Record<string, unknown>)['price']),
        stock: Number((productRow as Record<string, unknown>)['stock']),
        category: String((productRow as Record<string, unknown>)['category']),
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          error: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`
        })
      }

      const subtotal = product.price * item.quantity
      total += subtotal

      // Deduct stock
      updateStock.run(item.quantity, item.productId)

      orderItems.push({
        productId: product.id,
        name: product.name,
        unitPrice: product.price,
        quantity: item.quantity,
        subtotal,
      })
    } catch (error) {
      console.error(`Error processing item ${item.productId}:`, error)
      return res.status(500).json({ error: `Failed to process item ${item.productId}` })
    }
  }

  // Ensure total is valid
  if (isNaN(total) || total <= 0) {
    return res.status(400).json({ error: 'Invalid order total' })
  }

  const tax = Number(total * 0.1)
  const grandTotal = Number(total + tax)

  // Create order
  try {
    const result = createOrder.run(grandTotal, tax, payment_method)
    const orderId = result.lastInsertRowid!

    // Insert order items
    for (const item of orderItems) {
      createOrderItems.run(orderId, item.productId, item.quantity, item.unitPrice, item.subtotal)
    }

    const orderData = getOrderByIdWithItems.get([orderId])
    if (!orderData) {
      return res.status(500).json({ error: 'Failed to create order' })
    }

    res.status(201).json({
      id: Number((orderData as Record<string, unknown>)['id']),
      total: Number((orderData as Record<string, unknown>)['total']),
      tax: Number((orderData as Record<string, unknown>)['tax']),
      payment_method: String((orderData as Record<string, unknown>)['payment_method']),
      status: String((orderData as Record<string, unknown>)['status']),
      created_at: String((orderData as Record<string, unknown>)['created_at']),
      items_json: (orderData as Record<string, unknown>)['items_json'] || []
    })
  } catch (error) {
    console.error('Error creating order:', error)
    res.status(500).json({ error: 'Failed to create order' })
  }
})

// GET /api/orders - Get all orders
router.get('/', (req: Request, res: Response) => {
  try {
    
    const rows = getAllOrdersWithItems.all() as Record<string, unknown>[]
    const orders: Order[] = []
    
    rows.forEach((row) => {
      orders.push({
        id: Number(row[0]),
        total: Number(row[1]),
        tax: Number(row[2]),
        payment_method: String(row[3]),
        status: String(row[4]),
        created_at: String(row[5]),
        items_json: row[6] ? JSON.parse(String(row[6])) : []
      })
    })

    res.json(orders)
  } catch (error) {
    console.error('Error fetching orders:', error)
    res.status(500).json({ error: 'Failed to fetch orders' })
  }
})

// GET /api/orders/:id - Get single order with items
router.get('/:id', (req: Request, res: Response) => {
  try {
    const row = getOrderByIdWithItems.get([req.params.id]) as unknown[]
    if (!row) {
      return res.status(404).json({ error: 'Order not found' })
    }

    res.json({
      id: Number(row[0]),
      total: Number(row[1]),
      tax: Number(row[2]),
      payment_method: String(row[3]),
      status: String(row[4]),
      created_at: String(row[5]),
      items_json: row[6] || []
    })
  } catch (error) {
    console.error('Error fetching order:', error)
    res.status(500).json({ error: 'Failed to fetch order' })
  }
})

export default router
