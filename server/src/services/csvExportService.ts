import { getDb } from '../database.js'
import { Database } from 'better-sqlite3'
import { OrderExport } from 'shared'

export class CsvExportService {
  private db: Database

  constructor() {
    this.db = getDb()
  }

  /**
   * Fetch all orders with aggregated item lines for CSV export
   */
  async fetchAllOrders(): Promise<OrderExport[]> {
    interface OrderRow {
      id: string
      datetime: string
      items: string | null
      total: number
      discount: number
      paymentMethod: string
    }

    const query = `
      SELECT
        o.id as id,
        o.created_at as datetime,
        GROUP_CONCAT(p.name || ' (' || oi.quantity || ')', ', ') as items,
        o.total as total,
        o.discount as discount,
        o.payment_method as paymentMethod
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN products p ON p.id = oi.product_id
      GROUP BY o.id
      ORDER BY o.created_at ASC, o.id ASC
    `

    const rows = this.db.prepare(query).all() as OrderRow[]
    return rows.map((row) => ({
      id: String(row.id),
      datetime: String(row.datetime),
      items: row.items ? String(row.items) : '',
      total: Number(row.total),
      discount: Number(row.discount) || 0,
      paymentMethod: String(row.paymentMethod),
    }))
  }

  /**
   * Quote and escape a CSV cell when it contains special characters
   */
  private csvCell(value: string): string {
    if (/[",\n\r]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  /**
   * Format orders as CSV string with a UTF-8 BOM prefix
   */
  formatAsCSV(orders: OrderExport[]): string {
    const lines: string[] = []
    lines.push('Order ID,Date/Time,Items,Total Amount,Discount,Payment Method')

    orders.forEach((order) => {
      lines.push([
        order.id,
        order.datetime.replace(' ', 'T'),
        this.csvCell(order.items),
        Number(order.total).toFixed(2),
        Number(order.discount).toFixed(2),
        order.paymentMethod,
      ].join(','))
    })

    return '\uFEFF' + lines.join('\r\n')
  }

  /**
   * Export data to CSV file
   */
  async exportToCSV(filename: string = 'orders.csv'): Promise<void> {
    const data = await this.fetchAllOrders()
    const csvContent = this.formatAsCSV(data)

    // In a real implementation, you would write to a file
    // For now, we'll just log the CSV content
    console.log('CSV Content:')
    console.log(csvContent)
    console.log(`\nCSV file would be saved as: ${filename}`)
  }
}