import { getDb } from '../database.js'
import type {
  DailyReport,
  MonthlyReport,
  TopProduct
} from 'shared'

export class CsvExportService {
  private db: any

  constructor() {
    this.db = getDb()
  }

  /**
   * Fetch all data needed for CSV export
   */
  async fetchAllData(): Promise<{
    dailyData: DailyReport[]
    monthlyData: MonthlyReport[]
    topProducts: TopProduct[]
    todaySummary: { orderCount: number; totalSales: number; averageOrderValue: number }
  }> {
    const today = new Date().toISOString().split('T')[0]

    // Get today's summary
    const todaySummary = this.db.prepare(`SELECT 
      COUNT(*) as order_count,
      SUM(total) as total_sales,
      AVG(total) as average_order_value
    FROM orders
    WHERE DATE(created_at) = ?`).get(today)

    const todayData: Record<string, unknown> = {}
    if (todaySummary) {
      todayData.orderCount = Number((todaySummary as Record<string, unknown>)['order_count']) || 0
      todayData.totalSales = Number((todaySummary as Record<string, unknown>)['total_sales']) || 0
      todayData.averageOrderValue = Number((todaySummary as Record<string, unknown>)['average_order_value']) || 0
    }

    // Get last 30 days data for chart
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const dailyDataRaw = this.db.prepare(`SELECT 
      DATE(created_at) as date,
      COUNT(*) as order_count,
      SUM(total) as total_sales
    FROM orders
    WHERE DATE(created_at) >= ?
    GROUP BY DATE(created_at)
    ORDER BY date ASC`).all(thirtyDaysAgo.toISOString().split('T')[0])

    const dailyData: DailyReport[] = dailyDataRaw.map((row: Record<string, unknown>) => ({
      date: row.date,
      orderCount: Number(row.order_count) || 0,
      totalSales: Number(row.total_sales) || 0
    }))

    // Get last 12 months data
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

    const monthlyDataRaw = this.db.prepare(`SELECT 
      strftime('%Y-%m', created_at) as month,
      CAST(strftime('%Y', created_at) AS INTEGER) as year,
      SUM(total) as total_sales,
      COUNT(*) as order_count
    FROM orders
    WHERE DATE(created_at) >= ?
    GROUP BY strftime('%Y-%m', created_at)
    ORDER BY month ASC`).all(twelveMonthsAgo.toISOString().split('T')[0])

    const monthlyData: MonthlyReport[] = monthlyDataRaw.map((row: Record<string, unknown>) => ({
      month: row.month,
      year: Number(row.year),
      totalSales: Number(row.total_sales) || 0,
      orderCount: Number(row.order_count) || 0
    }))

    // Get top 10 products by quantity sold
    const topProductsRaw = this.db.prepare(`SELECT 
      p.name,
      p.id,
      SUM(oi.quantity) as quantity_sold,
      SUM(oi.subtotal) as revenue
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    GROUP BY oi.product_id
    ORDER BY quantity_sold DESC
    LIMIT 10`).all()

    const topProducts: TopProduct[] = topProductsRaw.map((row: Record<string, unknown>) => ({
      name: row.name,
      productId: row.id,
      quantitySold: Number(row.quantity_sold) || 0,
      revenue: Number(row.revenue) || 0
    }))

    return {
      dailyData,
      monthlyData,
      topProducts,
      todaySummary: todayData
    }
  }

  /**
   * Format data as CSV string with UTF-8 with BOM encoding
   */
  formatAsCSV(data: {
    dailyData: DailyReport[]
    monthlyData: MonthlyReport[]
    topProducts: TopProduct[]
    todaySummary: { orderCount: number; totalSales: number; averageOrderValue: number }
  }): string {
    const lines: string[] = []

    // UTF-8 with BOM for Excel compatibility
    const bom = '\uFEFF'

    // Section 1: Today's Summary
    lines.push('=== 今日銷售摘要 ===')
    lines.push('指標，數值')
    lines.push(`訂單筆數，${data.todaySummary.orderCount}`)
    lines.push(`總銷售額，${data.todaySummary.totalSales.toFixed(2)}`)
    lines.push(`平均訂單金額，${data.todaySummary.averageOrderValue.toFixed(2)}`)
    lines.push('')

    // Section 2: Daily Sales Trend (last 30 days)
    lines.push('=== 每日銷售趨勢 (近 30 天) ===')
    lines.push('日期，訂單筆數，總銷售額')
    for (const day of data.dailyData) {
      lines.push(`${day.date},${day.orderCount},${day.totalSales.toFixed(2)}`)
    }
    lines.push('')

    // Section 3: Monthly Sales Summary (last 12 months)
    lines.push('=== 每月銷售統計 (近 12 個月) ===')
    lines.push('月份，年份，訂單筆數，總銷售額')
    for (const month of data.monthlyData) {
      lines.push(`${month.month},${month.year},${month.orderCount},${month.totalSales.toFixed(2)}`)
    }
    lines.push('')

    // Section 4: Top Products
    lines.push('=== 熱銷商品 TOP 10 ===')
    lines.push('排名，商品名稱，產品 ID，售出數量，銷售金額')
    data.topProducts.forEach((product, index) => {
      const rank = index + 1
      lines.push(`${rank},${product.name},${product.productId},${product.quantitySold},${product.revenue.toFixed(2)}`)
    })

    return bom + lines.join('\n')
  }
}
