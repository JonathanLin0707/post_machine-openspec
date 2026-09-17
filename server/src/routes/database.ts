import express from 'express'
import { query } from '../database.js'
import {
  DatabaseImportService,
  HttpError,
} from '../services/databaseImportService.js'

const router = express.Router()

const importService = new DatabaseImportService()

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

router.post('/import', async (req, res) => {
  try {
    const summary = await importService.importBackup(req.body?.mode, req.body?.backup)
    res.json({ success: true, ...summary })
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message })
      return
    }
    console.error('Database import error:', error)
    res.status(500).json({ error: 'Failed to import database' })
  }
})

export default router