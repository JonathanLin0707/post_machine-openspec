import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  onClose: () => void
}

export default function Toast({ message, type = 'info', onClose }: ToastProps) {
  const [visible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  const getToastClass = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white'
      case 'error':
        return 'bg-red-500 text-white'
      default:
        return 'bg-blue-500 text-white'
    }
  }

  if (!visible) return null

  return (
    <div className={`fixed top-4 right-4 z-50 ${getToastClass()} rounded-lg shadow-lg px-6 py-4 font-bold text-lg flex items-center gap-3 animate-fade-in`}>
      <span>{message}</span>
      <button 
        className="hover:bg-white/20 rounded p-1"
        onClick={onClose}
      >
        ✕
      </button>
    </div>
  )
}
