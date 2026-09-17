import express from 'express'
import { query } from '../database.js'

const router = express.Router()

router.get('/export', async (req, res) => {
  try {
    const [products, orders, orderItems] = await Promise.all([
      query<Record<string, unknown>>('SELECT * FROM products ORDER BY id'),
      query<Record<string, unknown>>('SELECT * FROM orders ORDER BY id'),
      query<Record<string, unknown>>('SELECT * FROM order_items ORDER BY id'),
    ])

    const backup = {
      exportedAt: new Date().toISOString(),
      products: products.rows,
      orders: orders.rows,
      orderItems: orderItems.rows,
    }

    const filename = `grocery_backup_${new Date()
      .toISOString()
      .replace(/[:.]/g, '-')}.json`

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Cache-Control', 'no-cache')

    res.send(JSON.stringify(backup, null, 2))
  } catch (error) {
    console.error('Database export error:', error)
    res.status(500).json({
      error: 'Failed to export database',
    })
  }
})

export default router