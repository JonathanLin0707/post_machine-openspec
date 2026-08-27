import { useState, useEffect } from 'react'
import api from '../services/api'

interface OrderItem {
  id: string
  productId: string
  name: string
  quantity: number
  unitPrice: number
  subtotal: number
}

interface Order {
  id: string // 改為string type
  total: number
  tax: number
  payment_method: string
  status: string
  created_at: string
  items_json: OrderItem[]
}

interface ApiResponseOrder {
  id: string // 改為string type
  total: number
  tax: number
  payment_method: string
  status: string
  created_at: string
  items_json: string | OrderItem[]
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string | null>(null)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const response = await api.get('/orders')
      // 解析 items_json 字串為陣列
      const parsedOrders = response.data.map((order: ApiResponseOrder) => ({
        ...order,
        items_json: typeof order.items_json === 'string' 
          ? JSON.parse(order.items_json) 
          : order.items_json || []
      }))
      setOrders(parsedOrders)
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = orders.filter(order => {
    const orderId = order.id || 0
    const itemsArray = order.items_json || []
    
    const matchesSearch = orderId.toString().includes(searchQuery) ||
      itemsArray.some(item => item.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesStatus = filterStatus ? order.status === filterStatus : true
    return matchesSearch && matchesStatus
  })

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">訂單查詢</h1>
          <button
            onClick={fetchOrders}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg shadow-md"
          >
            🔄 重新整理
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4 flex gap-4 items-center">
          <input
            type="text"
            placeholder="搜尋訂單 ID 或商品名稱..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-500"
          />
          <select
            value={filterStatus || ''}
            onChange={(e) => setFilterStatus(e.target.value || null)}
            className="px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-500"
          >
            <option value="">全部狀態</option>
            <option value="completed">已完成</option>
            <option value="pending">處理中</option>
            <option value="cancelled">已取消</option>
          </select>
        </div>

        {/* Orders List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center text-gray-500 py-8">載入中...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center text-gray-500 py-8">尚未有訂單資料</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">訂單編號</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">日期</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">支付方式</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">總金額</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">狀態</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">商品數量</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">編號 {order.id || '未指定'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {order.created_at ? new Date(order.created_at).toLocaleDateString('zh-TW') : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{order.payment_method || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">{formatCurrency(order.total || 0)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          order.status === 'completed' ? 'bg-green-100 text-green-800' :
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {order.status || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {order.items_json?.length || 0} 件
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => {
                            const firstItem = order.items_json?.[0]
                            if (firstItem) {
                              window.open(`/products?id=${firstItem.productId}`, '_blank')
                            }
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          查看商品
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="mt-4 bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            共 {orders.length} 筆訂單
          </p>
        </div>
      </div>
    </div>
  )
}
