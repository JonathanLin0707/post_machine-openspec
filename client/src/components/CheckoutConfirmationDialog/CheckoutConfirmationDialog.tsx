import { useState } from 'react'
import { CartItem } from '../../../shared/types'

interface CheckoutConfirmationDialogProps {
  cartItems: CartItem[]
  subtotal: number
  total: number
  paymentMethod: string | null
  onConfirm: () => void
  onCancel: () => void
}

export default function CheckoutConfirmationDialog({
  cartItems,
  subtotal,
  total,
  paymentMethod,
  onConfirm,
  onCancel,
}: CheckoutConfirmationDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleConfirm = async () => {
    setIsProcessing(true)
    try {
      await onConfirm()
    } finally {
      setIsProcessing(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4">
          <h2 className="text-2xl font-bold">結帳確認</h2>
          <p className="text-blue-100 mt-1">請確認訂單資訊無誤後再進行結帳</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Order Items List */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
              訂單商品
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {cartItems.map((item) => (
                <div key={item.productId} className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">{item.name}</span>
                  <span className="text-gray-500">x{item.quantity}</span>
                  <span className="font-medium text-gray-900">${item.subtotal.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Amount Summary */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex justify-between text-gray-600">
              <span>小計</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between font-bold text-xl pt-2 border-t border-gray-300">
              <span className="text-blue-600">總計</span>
              <span className="text-blue-600">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="pt-2 border-t">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">支付方式</h3>
            <div className="bg-gray-100 rounded-lg p-4 text-center">
              {paymentMethod === 'cash' && (
                <span className="text-green-700 font-bold text-lg">現金</span>
              )}
              {paymentMethod === 'credit_card' && (
                <span className="text-blue-700 font-bold text-lg">信用卡</span>
              )}
              {paymentMethod === 'mobile_payment' && (
                <span className="text-purple-700 font-bold text-lg">行動支付</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="bg-gray-50 px-6 py-4 flex gap-3">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                處理中...
              </span>
            ) : (
              '確認結帳'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
