import { getDb } from '../database.js'
import { Database } from 'better-sqlite3'
import { DailyReport, MonthlyReport, TopProduct } from 'shared'

export class CsvExportService {
  private db: Database

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
    // Fetch daily reports
    interface DailyRow {
      date: string
      orderCount: number
      totalSales: number
      averageOrderValue: number
    }
    const dailyQuery = `
      SELECT 
        date(created_at) as date,
        COUNT(*) as orderCount,
        SUM(total) as totalSales,
        AVG(total) as averageOrderValue
      FROM orders
      GROUP BY date(created_at)
      ORDER BY date ASC
    `
    const dailyRows = this.db.prepare(dailyQuery).all() as DailyRow[]
    const dailyData: DailyReport[] = dailyRows.map((row) => ({
      date: String(row.date),
      orderCount: Number(row.orderCount),
      totalSales: Number(row.totalSales),
      averageOrderValue: Number(row.averageOrderValue),
    }))

    // Fetch monthly reports
    interface MonthlyRow {
      month: string
      year: number
      totalSales: number
      orderCount: number
    }
    const monthlyQuery = `
      SELECT 
        strftime('%Y-%m', created_at) as month,
        strftime('%Y', created_at) as year,
        SUM(total) as totalSales,
        COUNT(*) as orderCount
      FROM orders
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month ASC
    `
    const monthlyRows = this.db.prepare(monthlyQuery).all() as MonthlyRow[]
    const monthlyData: MonthlyReport[] = monthlyRows.map((row) => ({
      month: String(row.month),
      year: Number(row.year),
      totalSales: Number(row.totalSales),
      orderCount: Number(row.orderCount),
    }))

    // Fetch top products
    const topProductsQuery = `
      SELECT 
        p.id as productId,
        p.name,
        SUM(oi.quantity) as quantitySold,
        SUM(oi.subtotal) as revenue
      FROM products p
      JOIN order_items oi ON p.id = oi.product_id
      GROUP BY p.id
      ORDER BY quantitySold DESC
      LIMIT 10
    `
    interface TopProductRow {
      productId: string
      name: string
      quantitySold: number
      revenue: number
    }
    const topProductsRows = this.db.prepare(topProductsQuery).all() as TopProductRow[]
    const topProducts: TopProduct[] = topProductsRows.map((row) => ({
      productId: String(row.productId),
      name: String(row.name),
      quantitySold: Number(row.quantitySold),
      revenue: Number(row.revenue),
    }))

    // Fetch today summary
    const todayQuery = `
      SELECT 
        COUNT(*) as orderCount,
        SUM(total) as totalSales,
        AVG(total) as averageOrderValue
      FROM orders
      WHERE date(created_at) = date('now')
    `
    interface TodayRow {
      orderCount: number
      totalSales: number
      averageOrderValue: number
    }
    const todayRow = this.db.prepare(todayQuery).get() as TodayRow
    const todaySummary: { orderCount: number; totalSales: number; averageOrderValue: number } = {
      orderCount: Number(todayRow.orderCount) || 0,
      totalSales: Number(todayRow.totalSales) || 0,
      averageOrderValue: Number(todayRow.averageOrderValue) || 0,
    }

    return {
      dailyData,
      monthlyData,
      topProducts,
      todaySummary,
    }
  }

  /**
   * Format data as CSV string
   */
  formatAsCSV(data: {
    dailyData: DailyReport[]
    monthlyData: MonthlyReport[]
    topProducts: TopProduct[]
    todaySummary: { orderCount: number; totalSales: number; averageOrderValue: number }
  }): string {
    const lines: string[] = []

    // Daily report section
    lines.push('=== Daily Sales Report ===')
    lines.push('Date,Order Count,Total Sales,Average Order Value')
    data.dailyData.forEach((report) => {
      lines.push(`${report.date},${report.orderCount},${report.totalSales},${report.averageOrderValue}`)
    })

    // Monthly report section
    lines.push('')
    lines.push('=== Monthly Sales Report ===')
    lines.push('Month,Year,Total Sales,Order Count')
    data.monthlyData.forEach((report) => {
      lines.push(`${report.month},${report.year},${report.totalSales},${report.orderCount}`)
    })

    // Top products section
    lines.push('')
    lines.push('=== Top Products ===')
    lines.push('Product ID,Product Name,Quantity Sold,Revenue')
    data.topProducts.forEach((product) => {
      lines.push(`${product.productId},"${product.name}",${product.quantitySold},${product.revenue}`)
    })

    // Today summary section
    lines.push('')
    lines.push('=== Today Summary ===')
    lines.push(`Order Count,Total Sales,Average Order Value`)
    lines.push(`${data.todaySummary.orderCount},${data.todaySummary.totalSales},${data.todaySummary.averageOrderValue}`)

    return lines.join('\n')
  }

  /**
   * Export data to CSV file
   */
  async exportToCSV(filename: string = 'sales_report.csv'): Promise<void> {
    const data = await this.fetchAllData()
    const csvContent = this.formatAsCSV(data)

    // In a real implementation, you would write to a file
    // For now, we'll just log the CSV content
    console.log('CSV Content:')
    console.log(csvContent)
    console.log(`\nCSV file would be saved as: ${filename}`)
  }
}
