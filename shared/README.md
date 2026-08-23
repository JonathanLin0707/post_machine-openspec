# POS 系統 (Point of Sale)

這是一個完整的收銀系統（POS），包含前端 React UI、後端 Node.js API 與共用 TypeScript 型別定義。

## 專案結構

### 前端 (`client`)

| 目錄 | 說明 |
|------|------|
| `src/components/` | React UI 元件，包括購物車管理、分類篩選、結帳確認對話框、產品卡片、佈局框架與通知提示等 |
| `src/pages/` | 頁面組件，例如 POS 主頁（收銀介面）、銷售報表等 |
| `src/services/` | 資料庫導出等功能服務 |

### 後端 (`server`)

| 目錄 | 說明 |
|------|------|
| `src/database.ts` | SQLite 資料庫初始化與 Schema 管理，使用 better-sqlite3 自動持久化 |
| `src/services/` | CSV 匯出服務，用於生成銷售報告的 CSV 檔案 |

### 共用型別 (`shared`)

| 目錄 | 說明 |
|------|------|
| `types.ts` / `dist/types.d.ts` | 訂單、產品、購物車項目、每日/每月報表等共用 TypeScript 型別定義 |

## 主要功能

- **收銀介面**：掃描條碼或搜尋商品，加入購物車，選擇付款方式（現金、信用卡、行動支付）
- **銷售報表**：查看每日與每月的銷售數據統計
- **CSV 匯出**：將銷售報告導出為 CSV 檔案
- **資料庫管理**：使用 SQLite 儲存產品、訂單等資料

## 技術棧

- **前端**：React + TypeScript
- **後端**：Node.js + better-sqlite3
- **共用型別**：TypeScript

## 開發者設定

請將 `shared/types.ts` 加入聊天中，以便我可以直接編輯它。如果你需要修改其他檔案，也請先將其加入到聊天中。
