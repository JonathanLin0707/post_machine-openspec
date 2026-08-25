import { getDb } from '../database.js'
import { Database } from 'better-sqlite3'
import { DailyReport, MonthlyReport, TopProduct } from '../../shared/types.js'

export class CsvExportService {
  private db: Database.Database

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
    const dailyRows = this.db.prepare(dailyQuery).all() as unknown[]
    const dailyData: DailyReport[] = dailyRows.map((row) => ({
      date: String(row[0]),
      orderCount: Number(row[1]),
      totalSales: Number(row[2]),
      averageOrderValue: Number(row[3]),
    }))

    // Fetch monthly reports
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
    const monthlyRows = this.db.prepare(monthlyQuery).all() as unknown[]
    const monthlyData: MonthlyReport[] = monthlyRows.map((row) => ({
      month: String(row[0]),
      year: Number(row[1]),
      totalSales: Number(row[2]),
      orderCount: Number(row[3]),
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
    const topProductsRows = this.db.prepare(topProductsQuery).all() as unknown[]
    const topProducts: TopProduct[] = topProductsRows.map((row) => ({
      productId: String(row[0]),
      name: String(row[1]),
      quantitySold: Number(row[2]),
      revenue: Number(row[3]),
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
    const todayRow = this.db.prepare(todayQuery).get() as unknown[]
    const todaySummary: { orderCount: number; totalSales: number; averageOrderValue: number } = {
      orderCount: Number(todayRow[0]) || 0,
      totalSales: Number(todayRow[1]) || 0,
      averageOrderValue: Number(todayRow[2]) || 0,
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
