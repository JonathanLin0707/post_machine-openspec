import { useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './Layout.css'
import { exportDatabase } from '../services/databaseService'
import ExportConfirmationDialog from './ExportConfirmationDialog/ExportConfirmationDialog'
import ImportDialog from './ImportDialog/ImportDialog'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const [activeTab] = useState('pos')
  const location = useLocation()
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const isExportingRef = useRef(false)

  const openExportDialog = () => setIsExportDialogOpen(true)
  const closeMenu = () => setIsMenuOpen(false)

  const openDialogAndClose = (action: 'export' | 'import') => {
    closeMenu()
    if (action === 'export') {
      openExportDialog()
    } else {
      setIsImportDialogOpen(true)
    }
  }

  type NavVariant = 'desktop' | 'mobile'

  const isNavActive = (itemId: string) =>
    activeTab === itemId || location.pathname.startsWith(`/${itemId}`)

  const renderNavItems = (variant: NavVariant, onNavigate?: () => void) => {
    const linkBase = variant === 'mobile' ? 'block px-4 py-3' : 'px-4 py-2'
    const dbButtonBase =
      variant === 'mobile'
        ? 'block w-full text-left px-4 py-3'
        : 'inline-flex items-center px-4 py-2'
    const activeClass = (itemId: string) =>
      isNavActive(itemId) ? 'bg-primary text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
    return (
      <>
        {navItems.map((item) => (
          <Link
            key={item.id}
            to={`/${item.id}`}
            onClick={onNavigate}
            className={`${linkBase} rounded-lg font-medium transition-all duration-200 ${activeClass(item.id)}`}
          >
            {item.icon} {item.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => openDialogAndClose('export')}
          className={`${dbButtonBase} rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-all duration-200`}
        >
          💾 匯出資料庫
        </button>
        <button
          type="button"
          onClick={() => openDialogAndClose('import')}
          className={`${dbButtonBase} rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-all duration-200`}
        >
          📥 匯入資料庫
        </button>
      </>
    )
  }

  const handleImportSuccess = () => {
    setIsImportDialogOpen(false)
    alert('資料庫匯入成功')
  }

  const handleExportDatabase = async () => {
    if (isExportingRef.current) return
    isExportingRef.current = true
    setIsExporting(true)
    try {
      await exportDatabase()
    } catch (error) {
      console.error('Database export failed:', error)
      alert('資料庫匯出失敗')
    } finally {
      isExportingRef.current = false
      setIsExporting(false)
      setIsExportDialogOpen(false)
    }
  }

  const navItems = [
    { id: 'cart', label: '購物車', icon: '🛒' },
    { id: 'orders', label: '訂單查詢', icon: '📋' },
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
            {/* Desktop nav (hidden on mobile) */}
            <div className="hidden md:flex items-center space-x-2">
              {renderNavItems('desktop')}
            </div>
            {/* Mobile hamburger (desktop hidden) */}
            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg text-gray-600 hover:bg-gray-100"
              aria-label={isMenuOpen ? '關閉選單' : '開啟選單'}
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((open) => !open)}
            >
              <span aria-hidden="true" className="text-2xl">{isMenuOpen ? '✕' : '☰'}</span>
            </button>
          </div>
          {/* Mobile dropdown menu */}
          {isMenuOpen && (
            <nav aria-label="手機導覽" className="md:hidden border-t border-gray-200 px-4 py-2 space-y-1">
              {renderNavItems('mobile', closeMenu)}
            </nav>
          )}
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      {isExportDialogOpen && (
        <ExportConfirmationDialog
          title="匯出資料庫確認"
          message="確定要將目前的資料庫匯出為檔案嗎？"
          confirmLabel="確認"
          cancelLabel="取消"
          isProcessing={isExporting}
          onConfirm={handleExportDatabase}
          onCancel={() => setIsExportDialogOpen(false)}
        />
      )}
      {isImportDialogOpen && (
        <ImportDialog
          onCancel={() => setIsImportDialogOpen(false)}
          onImported={handleImportSuccess}
        />
      )}
    </div>
  )
}
