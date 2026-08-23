import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './Layout.css'
import { exportDatabase } from '../services/databaseService'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const [activeTab] = useState('pos')
  const location = useLocation()

  const handleExportDatabase = async () => {
    try {
      await exportDatabase()
    } catch (error) {
      console.error('Database export failed:', error)
      alert('資料庫匯出失敗')
    }
  }

  const navItems = [
    { id: 'orders', label: '收銀台', icon: '🛒' },
    { id: 'products', label: '商品管理', icon: '📦' },
    { id: 'reports', label: '銷售報表', icon: '📊' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary">🛒 Grocery POS</h1>
            </div>
            <div className="flex items-center space-x-2">
              {navItems.map((item) => (
                <Link
                  key={item.id}
                  to={`/${item.id}`}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${activeTab === item.id || location.pathname.startsWith(`/${item.id}`)
                      ? 'bg-primary text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  {item.icon} {item.label}
                </Link>
              ))}

              <button
                type="button"
                onClick={handleExportDatabase}
                className="inline-flex items-center px-4 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-all duration-200"
              >
                💾 匯出資料庫
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
