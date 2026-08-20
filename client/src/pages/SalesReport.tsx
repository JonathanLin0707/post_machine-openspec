import { useState, useEffect } from 'react'
import api from '../services/api'
import { DailyReport, MonthlyReport, TopProduct } from '../../../shared/types'

// Helper function for safe nested property access with fallback values
function safeGet<T>(obj: any, path: string, defaultValue: T): T {
  return (obj?.[path] ?? defaultValue) as T
}

export default function SalesReport() {
  const [dailyData, setDailyData] = useState<DailyReport[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthlyReport[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [todaySummary, setTodaySummary] = useState({
    orderCount: 0,
    totalSales: 0,
    averageOrderValue: 0
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchReports()
  }, [])

  // Type conversion logic with fallback to 0 for all numeric displays
  function parseNumeric(value: any): number {
    if (value === null || value === undefined || value === '') return 0
    const num = Number(value)
    return isNaN(num) ? 0 : num
  }

  // Null/undefined handling with safeGet helper for nested property access
  function parseSafeNumeric(obj: any, field: string): number {
    return parseNumeric(safeGet(obj, field, null))
  }

  const fetchReports = async () => {
    setLoading(true)
    try {
      const [dailyRes, monthlyRes, topRes] = await Promise.all([
        api.get('/reports/daily'),
        api.get('/reports/monthly'),
        api.get('/reports/top-products')
      ])

      const dailyResponse = dailyRes.data as { today?: any; chart?: DailyReport[] }
      const dailyDataRaw = (dailyResponse.chart || [])
      
      // Handle empty arrays: ensure no React warnings when today has no orders
      const dailyData: DailyReport[] = dailyDataRaw.map(d => ({
        date: d.date,
        orderCount: parseNumeric(d.orderCount),
        totalSales: parseNumeric(d.totalSales),
        averageOrderValue: 0
      }))

      // Monthly report returns flat array directly
      const monthlyDataRaw = monthlyRes.data || []
      
      // Handle empty arrays for monthly data
      const monthlyData: MonthlyReport[] = monthlyDataRaw.map(m => ({
        month: m.month,
        year: m.year,
        orderCount: parseNumeric(m.orderCount),
        totalSales: parseNumeric(m.totalSales)
      }))

      const topProductsArray = (topRes.data || []) as { name: string; productId: string; quantitySold: number; revenue: number }[]

      setDailyData(dailyData)
      setMonthlyData(monthlyData)
      
      // Handle empty arrays for top products
      setTopProducts(topProductsArray.map(p => ({
        productId: p.productId,
        name: p.name,
        quantitySold: parseNumeric(p.quantitySold),
        revenue: parseNumeric(p.revenue)
      })))

      // Calculate today's summary from daily data with proper null handling
      const today = new Date().toISOString().split('T')[0]
      const todaysReport = dailyData.find(r => r.date === today)
      
      if (todaysReport) {
        setTodaySummary({
          orderCount: parseNumeric(todaysReport.orderCount),
          totalSales: parseNumeric(todaysReport.totalSales),
          averageOrderValue: todaysReport.orderCount > 0
            ? parseNumeric(todaysReport.totalSales) / parseNumeric(todaysReport.orderCount)
            : 0
        })
      } else {
        // No data for today, show zero summary
        setTodaySummary({
          orderCount: 0,
          totalSales: 0,
          averageOrderValue: 0
        })
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportCSV = async () => {
    try {
      const response = await api.get('/reports/export', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `sales_report_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Failed to export CSV:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">銷售報表</h1>
          <button
            onClick={exportCSV}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-lg shadow-md"
          >
            📥 匯出 CSV
          </button>
        </div>

        {/* Today's Summary */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-sm p-6 mb-4">
          <h2 className="text-xl font-bold text-white mb-4">今日銷售摘要</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/20 rounded-lg p-4 text-center">
              <p className="text-blue-100 text-sm">訂單筆數</p>
              <p className="text-4xl font-bold text-white">{todaySummary.orderCount}</p>
            </div>
            <div className="bg-white/20 rounded-lg p-4 text-center">
              <p className="text-blue-100 text-sm">總銷售額</p>
              <p className="text-3xl font-bold text-white">${todaySummary.totalSales.toFixed(2)}</p>
            </div>
            <div className="bg-white/20 rounded-lg p-4 text-center">
              <p className="text-blue-100 text-sm">平均訂單金額</p>
              <p className="text-3xl font-bold text-white">${todaySummary.averageOrderValue.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Daily Sales Line Chart */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">每日銷售趨勢</h3>
            {loading ? (
              <div className="text-center text-gray-500 py-8">載入中...</div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {dailyData.map((day) => (
                  <div key={day.date} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700 w-24">{day.date}</span>
                    <span className="text-sm text-gray-600 w-32">{day.orderCount} 筆訂單</span>
                    <span className="text-lg font-bold text-blue-600">${day.totalSales.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Monthly Sales Bar Chart */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">每月銷售統計</h3>
            {loading ? (
              <div className="text-center text-gray-500 py-8">載入中...</div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {monthlyData.map((month) => (
                  <div key={`${month.month}-${month.year}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700 w-28">{month.month} {month.year}</span>
                    <span className="text-sm text-gray-600 w-32">{month.orderCount} 筆訂單</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-blue-200 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full transition-all"
                          style={{ width: `${(month.totalSales / Math.max(...monthlyData.map(m => m.totalSales)) * 100)}%` }}
                        />
                      </div>
                      <span className="text-lg font-bold text-blue-600 w-24 text-right">${month.totalSales.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-lg shadow-sm p-4 lg:col-span-2">
            <h3 className="text-lg font-bold text-gray-800 mb-4">熱銷商品 TOP 10</h3>
            {loading ? (
              <div className="text-center text-gray-500 py-8">載入中...</div>
            ) : topProducts.length === 0 ? (
              <div className="text-center text-gray-500 py-8">尚未有銷售數據</div>
            ) : (
              <div className="space-y-2">
                {topProducts.slice(0, 10).map((product, index) => (
                  <div
                    key={product.productId}
                    className={`flex items-center justify-between p-3 rounded-lg ${index < 3 ? 'bg-yellow-50' : 'bg-gray-50'
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                          index === 2 ? 'bg-orange-400' : 'bg-gray-300'
                        }`}>
                        {index + 1}
                      </span>
                      <span className="font-medium text-gray-800">{product.name}</span>
                    </div>
                    <div className="flex gap-6 text-right">
                      <span className="text-sm text-gray-600">售出：{product.quantitySold} 件</span>
                      <span className="text-lg font-bold text-green-600">${product.revenue.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Refresh Button */}
        <div className="text-center">
          <button
            onClick={fetchReports}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-6 rounded-lg transition-colors"
          >
            🔄 重新整理
          </button>
        </div>
      </div>
    </div>
  )
}
