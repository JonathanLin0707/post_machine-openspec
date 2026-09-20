import { Router, Request, Response } from 'express'
import { query } from '../database.js'
import { CsvExportService } from '../services/csvExportService.js'

const csvExportService = new CsvExportService()

const router = Router()

// GET /api/reports/daily - Daily sales report
router.get('/daily', async (req: Request, res: Response) => {
  // Get today's summary
  const today = new Date().toISOString().split('T')[0]

  try {
    const todayResult = await query<Record<string, unknown>>(`SELECT
      COUNT(*) as order_count,
      SUM(total) as total_sales,
      AVG(total) as average_order_value
    FROM orders
    WHERE (created_at AT TIME ZONE 'UTC')::date = $1::date`, [today])

    const todayData: Record<string, unknown> = {}
    const todaySummary = todayResult.rows[0]
    if (todaySummary) {
      todayData.order_count = Number(todaySummary['order_count']) || 0
      todayData.total_sales = Number(todaySummary['total_sales']) || 0
      todayData.average_order_value = Number(todaySummary['average_order_value']) || 0
    }

    // Get last 30 days data for chart
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const dailyResult = await query<Record<string, unknown>>(`SELECT
      to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') as date,
      COUNT(*) as order_count,
      SUM(total) as total_sales
    FROM orders
    WHERE (created_at AT TIME ZONE 'UTC')::date >= $1::date
    GROUP BY to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')
    ORDER BY date ASC`, [thirtyDaysAgo.toISOString().split('T')[0]])

    const result = dailyResult.rows.map((row) => ({
      date: row.date,
      orderCount: Number(row.order_count) || 0,
      totalSales: Number(row.total_sales) || 0
    }))

    res.json({ today: todayData, chart: result })
  } catch (error) {
    console.error('Error fetching daily report:', error)
    res.status(500).json({ error: 'Failed to fetch daily report' })
  }
})

// GET /api/reports/monthly - Monthly sales report
router.get('/monthly', async (req: Request, res: Response) => {
  // Get last 12 months data
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

  try {
    const monthlyResult = await query<Record<string, unknown>>(`SELECT
      to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM') as month,
      to_char(created_at AT TIME ZONE 'UTC', 'YYYY')::int as year,
      SUM(total) as total_sales,
      COUNT(*) as order_count
    FROM orders
    WHERE (created_at AT TIME ZONE 'UTC')::date >= $1::date
    GROUP BY to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM'),
             to_char(created_at AT TIME ZONE 'UTC', 'YYYY')
    ORDER BY month ASC`, [twelveMonthsAgo.toISOString().split('T')[0]])

    const result = monthlyResult.rows.map((row) => ({
      month: row.month,
      year: Number(row.year),
      totalSales: Number(row.total_sales) || 0,
      orderCount: Number(row.order_count) || 0
    }))

    res.json(result)
  } catch (error) {
    console.error('Error fetching monthly report:', error)
    res.status(500).json({ error: 'Failed to fetch monthly report' })
  }
})

// GET /api/reports/top-products - Top selling products
router.get('/top-products', async (req: Request, res: Response) => {
  // Get top 10 products by quantity sold.
  // Per openspec/specs/order-discount/spec.md, revenue figures SHALL be computed
  // from each order's stored (already discounted) total, so the order discount
  // is allocated across its lines proportionally to line subtotal.
  try {
    const topResult = await query<Record<string, unknown>>(`SELECT
      p.name,
      p.id,
      SUM(oi.quantity) as quantity_sold,
      SUM(
        CASE
          WHEN order_totals.subtotal > 0
          THEN oi.subtotal * (o.total / order_totals.subtotal)
          ELSE 0
        END
      ) as revenue
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN orders o ON oi.order_id = o.id
    JOIN (
      SELECT order_id, SUM(subtotal) AS subtotal
      FROM order_items
      GROUP BY order_id
    ) AS order_totals ON order_totals.order_id = o.id
    GROUP BY oi.product_id, p.name, p.id
    ORDER BY quantity_sold DESC
    LIMIT 10`)

    const result = topResult.rows.map((row) => ({
      name: row.name,
      productId: row.id,
      quantity_sold: Number(row.quantity_sold) || 0,
      revenue: Number(row.revenue) || 0
    }))

    res.json(result)
  } catch (error) {
    console.error('Error fetching top products:', error)
    res.status(500).json({ error: 'Failed to fetch top products' })
  }
})

// GET /api/reports/top-products?limit=5 - Custom limit for top products
router.get('/top-products/custom', async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 10

  try {
    const topResult = await query<Record<string, unknown>>(`SELECT
      p.name,
      p.barcode,
      SUM(oi.quantity) as quantity_sold,
      SUM(
        CASE
          WHEN order_totals.subtotal > 0
          THEN oi.subtotal * (o.total / order_totals.subtotal)
          ELSE 0
        END
      ) as revenue
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN orders o ON oi.order_id = o.id
    JOIN (
      SELECT order_id, SUM(subtotal) AS subtotal
      FROM order_items
      GROUP BY order_id
    ) AS order_totals ON order_totals.order_id = o.id
    GROUP BY oi.product_id, p.name, p.barcode
    ORDER BY quantity_sold DESC
    LIMIT $1`, [limit])

    const result = topResult.rows.map((row) => ({
      name: row.name,
      barcode: row.barcode,
      quantity_sold: Number(row.quantity_sold) || 0,
      revenue: Number(row.revenue) || 0
    }))

    res.json(result)
  } catch (error) {
    console.error('Error fetching top products:', error)
    res.status(500).json({ error: 'Failed to fetch top products' })
  }
})

// POST /api/reports/csv-export - Generate and download CSV report
router.post('/csv-export', async (req: Request, res: Response) => {
  try {
    // Fetch all orders needed for CSV export
    const data = await csvExportService.fetchAllOrders()

    // Format as CSV with UTF-8 BOM
    const csvContent = csvExportService.formatAsCSV(data)

    // Set headers for file download
    const today = new Date().toISOString().split('T')[0]
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="orders_${today}.csv"`)
    res.setHeader('Cache-Control', 'no-cache')

    // Send CSV content
    res.send(csvContent)
  } catch (error) {
    console.error('Error generating CSV export:', error)
    res.status(500).json({
      error: 'Failed to generate CSV export',
      message: (error as Error).message || 'Internal server error'
    })
  }
})

export default router