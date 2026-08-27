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
  id: string // 改為 string type
  total: number
  tax: number
  payment_method: string
  status: string
  created_at: string
  items_json: OrderItem[]
}

interface ApiResponseOrder {
  id: string // 改為 string type
  total: number
  tax: number
  payment_method: string
  status: string
  created_at: string
  items_json: string | OrderItem[]
}

// 數值解析函數，與 SalesReport.tsx 保持一致
function parseNumeric(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0
  const num = Number(value)
  return isNaN(num) ? 0 : num
}

// 商品詳情彈窗組件
interface OrderItemsModalProps {
  isOpen: boolean
  onClose: () => void
  items: OrderItem[]
}

function OrderItemsModal({ isOpen, onClose, items }: OrderItemsModalProps) {
  const [selectedItem, setSelectedItem] = useState<OrderItem | null>(null)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">訂單商品詳情</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>
        
        <div className="p-4">
          {items.length === 0 ? (
            <p className="text-gray-500 text-center py-8">此訂單沒有商品</p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{item.name}</h3>
                    <p className="text-sm text-gray-600">
                      單價: {item.unitPrice.toFixed(2)} / 數量: {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">
                      {item.subtotal.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">小計</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {selectedItem && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-bold text-blue-900 mb-2">商品詳情</h3>
              <p className="text-blue-800">{selectedItem.name}</p>
              <p className="text-blue-800">單價: {selectedItem.unitPrice.toFixed(2)}</p>
              <p className="text-blue-800">數量: {selectedItem.quantity}</p>
              <p className="text-blue-800">小計: {selectedItem.subtotal.toFixed(2)}</p>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t bg-gray-50 rounded-b-lg flex justify-end">
          <button
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [modalItems, setModalItems] = useState<OrderItem[]>([])

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const response = await api.get('/orders')
      // 解析 items_json 字串為陣列，與 SalesReport.tsx 的處理方式一致
      const parsedOrders = response.data.map((order: ApiResponseOrder) => {
        let items: OrderItem[] = []
        
        if (typeof order.items_json === 'string') {
          try {
            items = JSON.parse(order.items_json)
          } catch (error) {
            console.error('Failed to parse items_json:', error)
            items = []
          }
        } else if (Array.isArray(order.items_json)) {
          items = order.items_json
        }
        
        return {
          ...order,
          items_json: items,
          total: parseNumeric(order.total),
          tax: parseNumeric(order.tax)
        }
      })
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

  const handleViewItems = (items: OrderItem[]) => {
    setModalItems(items)
    setShowModal(true)
  }

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
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">{formatCurrency(order.total)}</td>
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
                          onClick={() => handleViewItems(order.items_json || [])}
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
      
      {/* 商品詳情彈窗 */}
      <OrderItemsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        items={modalItems}
      />
    </div>
  )
}
