import { Router, Request, Response } from 'express'
import { query, withTransaction } from '../database.js'

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

const GET_ORDER_BY_ID_SQL = `SELECT
  o.id, o.total, o.discount, o.tax, o.payment_method, o.status,
  to_char(o.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') AS created_at,
  COALESCE((
    SELECT json_agg(json_build_object(
      'id', oi.id,
      'productId', oi.product_id,
      'name', p.name,
      'quantity', oi.quantity,
      'unitPrice', oi.unit_price,
      'subtotal', oi.subtotal
    ) ORDER BY oi.id)
    FROM order_items oi
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = o.id
  ), '[]'::json) AS items_json
FROM orders o
WHERE o.id = $1`

const GET_ALL_ORDERS_SQL = `SELECT
  o.id, o.total, o.discount, o.tax, o.payment_method, o.status,
  to_char(o.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') AS created_at,
  COALESCE((
    SELECT json_agg(json_build_object(
      'id', oi.id,
      'productId', oi.product_id,
      'name', p.name,
      'quantity', oi.quantity,
      'unitPrice', oi.unit_price,
      'subtotal', oi.subtotal
    ) ORDER BY oi.id)
    FROM order_items oi
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = o.id
  ), '[]'::json) AS items_json
FROM orders o
ORDER BY o.created_at`

interface ProductRow {
  id: number
  name: string
  price: number
  stock: number
  category: string
}

interface OrderItem {
  id?: number
  productId: number
  name: string
  quantity: number
  unitPrice: number
  subtotal: number
}

interface OrderRow {
  id: number
  total: number
  discount: number | null
  tax: number
  payment_method: string
  status: string
  created_at: string
  items_json: unknown[] | null
}

function mapOrder(orderData: OrderRow) {
  return {
    id: Number(orderData['id']),
    total: Number(orderData['total']) || 0,
    discount: Number(orderData['discount']) || 0,
    tax: Number(orderData['tax']) || 0,
    payment_method: String(orderData['payment_method']),
    status: String(orderData['status']),
    created_at: String(orderData['created_at']),
    items_json: orderData['items_json'] || [],
  }
}

const router = Router()

// POST /api/orders - Create new order
router.post('/', async (req: Request, res: Response) => {
  const { items, payment_method, discount } = req.body

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order items are required' })
  }

  if (!payment_method || !['cash', 'credit_card', 'mobile_payment'].includes(payment_method)) {
    return res.status(400).json({ error: 'Invalid payment method' })
  }

  // Parse and validate discount (optional, in currency units)
  const parsedDiscount = typeof discount === 'number' ? discount : Number(discount) || 0
  if (isNaN(parsedDiscount) || parsedDiscount < 0) {
    return res.status(400).json({ error: 'Invalid discount amount' })
  }

  try {
    const orderData = await withTransaction(async (tx) => {
      // Validate and deduct stock for each item
      let subtotal = 0
      const orderItems: OrderItem[] = []

      for (const item of items) {
        try {
          const productRows = await tx.query<ProductRow>(
            'SELECT * FROM products WHERE id = $1',
            [item.productId],
          )
          const productRow = productRows.rows[0]
          if (!productRow) {
            throw new HttpError(404, `Product ${item.productId} not found`)
          }

          const product = {
            id: Number(productRow['id']),
            name: String(productRow['name']),
            price: Number(productRow['price']),
            stock: Number(productRow['stock']),
            category: String(productRow['category']),
          }

          if (product.stock < item.quantity) {
            throw new HttpError(
              400,
              `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`,
            )
          }

          const lineSubtotal = product.price * item.quantity
          subtotal += lineSubtotal

          // Deduct stock
          await tx.query(
            'UPDATE products SET stock = stock - $1, updated_at = now() WHERE id = $2',
            [item.quantity, item.productId],
          )

          orderItems.push({
            productId: product.id,
            name: product.name,
            unitPrice: product.price,
            quantity: item.quantity,
            subtotal: lineSubtotal,
          })
        } catch (error) {
          console.error(`Error processing item ${item.productId}:`, error)
          if (error instanceof HttpError) throw error
          throw new HttpError(500, `Failed to process item ${item.productId}`)
        }
      }

      // Validate discount against the computed subtotal before creating the order
      if (parsedDiscount > subtotal) {
        throw new HttpError(400, 'Discount cannot exceed order total')
      }

      const tax = 0
      const tax_price = Number(subtotal * tax)
      const grandTotal = Number((subtotal - parsedDiscount) + tax_price)

      // Create order
      const createResults = await tx.query<{ id: number }>(
        `INSERT INTO orders (total, discount, tax, payment_method, status)
         VALUES ($1, $2, $3, $4, 'completed') RETURNING id`,
        [grandTotal, parsedDiscount, tax_price, payment_method],
      )
      const orderId = createResults.rows[0].id

      // Insert order items
      for (const item of orderItems) {
        await tx.query(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
           VALUES ($1, $2, $3, $4, $5)`,
          [orderId, item.productId, item.quantity, item.unitPrice, item.subtotal],
        )
      }

      const orderRows = await tx.query<OrderRow>(GET_ORDER_BY_ID_SQL, [orderId])
      const orderData = orderRows.rows[0]
      if (!orderData) {
        throw new HttpError(500, 'Failed to create order')
      }

      return orderData
    })

    res.status(201).json(mapOrder(orderData))
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({ error: error.message })
    }
    console.error('Error creating order:', error)
    res.status(500).json({ error: 'Failed to create order' })
  }
})

// GET /api/orders - Get all orders
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query<OrderRow>(GET_ALL_ORDERS_SQL)
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching orders:', error)
    res.status(500).json({ error: 'Failed to fetch orders' })
  }
})

// GET /api/orders/:id - Get single order with items
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query<OrderRow>(GET_ORDER_BY_ID_SQL, [req.params.id])
    const orderData = result.rows[0]
    if (!orderData) {
      return res.status(404).json({ error: 'Order not found' })
    }
    res.json(mapOrder(orderData))
  } catch (error) {
    console.error('Error fetching order:', error)
    res.status(500).json({ error: 'Failed to fetch order' })
  }
})

export default router