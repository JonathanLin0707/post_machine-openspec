import { Router, Request, Response } from 'express'
import { initDatabase, getDb } from '../database.js'

initDatabase()
const db = getDb()

const router = Router()

// GET /api/reports/daily - Daily sales report
router.get('/daily', (req: Request, res: Response) => {
  // Get today's summary
  const today = new Date().toISOString().split('T')[0]
  
  try {
    const todaySummary = db.prepare(`SELECT 
      COUNT(*) as order_count,
      SUM(total) as total_sales,
      AVG(total) as average_order_value
    FROM orders
    WHERE DATE(created_at) = ?`).get(today)

    const todayData: any = {}
    if (todaySummary) {
      todayData.order_count = Number(todaySummary.order_count) || 0
      todayData.total_sales = Number(todaySummary.total_sales) || 0
      todayData.average_order_value = Number(todaySummary.average_order_value) || 0
    }

    // Get last 30 days data for chart
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const dailyData = db.prepare(`SELECT 
      DATE(created_at) as date,
      COUNT(*) as order_count,
      SUM(total) as total_sales
    FROM orders
    WHERE DATE(created_at) >= ?
    GROUP BY DATE(created_at)
    ORDER BY date ASC`).all(thirtyDaysAgo.toISOString().split('T')[0])

    const result = dailyData.map((row: any[]) => ({
      date: row[0],
      orderCount: Number(row[1]) || 0,
      totalSales: Number(row[2]) || 0
    }))

    res.json({ today: todayData, chart: result })
  } catch (error) {
    console.error('Error fetching daily report:', error)
    res.status(500).json({ error: 'Failed to fetch daily report' })
  }
})

// GET /api/reports/monthly - Monthly sales report
router.get('/monthly', (req: Request, res: Response) => {
  // Get last 12 months data
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

  try {
    const monthlyData = db.prepare(`SELECT 
      strftime('%Y-%m', created_at) as month,
      CAST(strftime('%Y', created_at) AS INTEGER) as year,
      SUM(total) as total_sales,
      COUNT(*) as order_count
    FROM orders
    WHERE DATE(created_at) >= ?
    GROUP BY strftime('%Y-%m', created_at)
    ORDER BY month ASC`).all(twelveMonthsAgo.toISOString().split('T')[0])

    const result = monthlyData.map((row: any[]) => ({
      month: row[0],
      year: Number(row[1]),
      totalSales: Number(row[2]) || 0,
      orderCount: Number(row[3]) || 0
    }))

    res.json(result)
  } catch (error) {
    console.error('Error fetching monthly report:', error)
    res.status(500).json({ error: 'Failed to fetch monthly report' })
  }
})

// GET /api/reports/top-products - Top selling products
router.get('/top-products', (req: Request, res: Response) => {
  // Get top 10 products by quantity sold
  try {
    const topProducts = db.prepare(`SELECT 
      p.name,
      p.barcode,
      SUM(oi.quantity) as quantity_sold,
      SUM(oi.subtotal) as revenue
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    GROUP BY oi.product_id
    ORDER BY quantity_sold DESC
    LIMIT 10`).all()

    const result = topProducts.map((row: any[]) => ({
      name: row[0],
      barcode: row[1],
      quantity_sold: Number(row[2]) || 0,
      revenue: Number(row[3]) || 0
    }))

    res.json(result)
  } catch (error) {
    console.error('Error fetching top products:', error)
    res.status(500).json({ error: 'Failed to fetch top products' })
  }
})

// GET /api/reports/top-products?limit=5 - Custom limit for top products
router.get('/top-products/custom', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 10
  
  try {
    const topProducts = db.prepare(`SELECT 
      p.name,
      p.barcode,
      SUM(oi.quantity) as quantity_sold,
      SUM(oi.subtotal) as revenue
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    GROUP BY oi.product_id
    ORDER BY quantity_sold DESC
    LIMIT ?`).all(limit)

    const result = topProducts.map((row: any[]) => ({
      name: row[0],
      barcode: row[1],
      quantity_sold: Number(row[2]) || 0,
      revenue: Number(row[3]) || 0
    }))

    res.json(result)
  } catch (error) {
    console.error('Error fetching top products:', error)
    res.status(500).json({ error: 'Failed to fetch top products' })
  }
})

export default router
