import { useState } from 'react'
import { extractImportError, importDatabase, type ImportMode } from '../../services/databaseService'

interface ImportDialogProps {
  onCancel: () => void
  onImported: () => void
}

const MODES: { value: ImportMode; label: string; description: string }[] = [
  { value: 'replace', label: '完整取代', description: '以備份檔覆蓋目前資料庫' },
  { value: 'merge', label: '合併', description: '保留既有資料，重複 id 以備份內容更新' },
]

export default function ImportDialog({ onCancel, onImported }: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState<ImportMode>('replace')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] ?? null)
    setError(null)
  }

  const handleConfirm = async () => {
    if (isProcessing) return
    if (!file) {
      setError('請選擇 .json 備份檔')
      return
    }
    if (!file.name.toLowerCase().endsWith('.json')) {
      setError('僅支援 .json 備份檔')
      return
    }
    setError(null)
    setIsProcessing(true)
    try {
      await importDatabase(file, mode)
      onImported()
    } catch (err) {
      setError(extractImportError(err))
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="bg-blue-600 text-white px-6 py-4 rounded-t-xl">
          <h2 className="text-2xl font-bold">匯入資料庫</h2>
          <p className="text-blue-100 mt-1">選擇 JSON 備份檔並設定匯入模式</p>
        </div>
        <div className="bg-gray-50 px-6 py-4 space-y-4">
          <div>
            <label htmlFor="import-file" className="block text-sm font-semibold text-gray-700 mb-1">
              備份檔案 (.json)
            </label>
            <input
              id="import-file"
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              disabled={isProcessing}
              className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:font-semibold file:px-4 file:py-2"
            />
          </div>
          <fieldset>
            <legend className="block text-sm font-semibold text-gray-700 mb-1">匯入模式</legend>
            <div className="flex gap-3">
              {MODES.map((option) => (
                <label
                  key={option.value}
                  className="flex-1 flex items-center gap-2 border rounded-lg p-3 bg-white cursor-pointer"
                >
                  <input
                    type="radio"
                    name="import-mode"
                    value={option.value}
                    checked={mode === option.value}
                    onChange={() => setMode(option.value)}
                    disabled={isProcessing}
                  />
                  <span className="text-sm font-medium text-gray-800">{option.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {MODES.find((option) => option.value === mode)?.description}
            </p>
          </fieldset>
          {error && (
            <p role="alert" className="text-red-600 text-sm">
              {error}
            </p>
          )}
        </div>
        <div className="bg-gray-100 px-6 py-4 flex gap-3 sticky bottom-0 rounded-b-xl">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            取消
          </button>
          <button
            type="button"
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
              '確認'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}