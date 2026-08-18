## Why

雜貨店收銀台需要一個高效、直觀的 POS 系統，讓店員可以快速完成點單和結帳流程。目前缺乏專用系統，導致結帳效率低、人為錯誤多、銷售數據難以追踪。本專案旨在建立一個 Web-based 的 POS 系統，提升收銀效率並提供即時銷售分析。

## What Changes

- 新增完整的雜貨店 POS 系統
- 實現商品管理功能（新增、編輯、刪除、搜尋、分類篩選）
- 實現購物車管理功能（加入商品、調整數量、移除、清空）
- 實現多種支付方式結帳（現金、信用卡、行動支付）
- 實現銷售報表功能（每日/每月統計、熱銷商品排行、匯出 CSV）
- 建立 SQLite 資料庫儲存商品、訂單、銷售數據
- 提供收銀台專用 UI（大按鈕、高對比、快速操作）

## Capabilities

### New Capabilities

- `product-management`: 商品管理能力，包含商品 CRUD、分類管理、庫存追蹤、搜尋篩選
- `pos-checkout`: 收銀台結帳能力，包含購物車管理、商品掃碼/搜尋加入、數量調整、多支付方式
- `sales-reporting`: 銷售報表能力，包含每日/每月統計、熱銷商品排行、報表匯出
- `database`: 資料庫能力，包含 SQLite Schema 定義、資料遷移、索引優化

### Modified Capabilities

（無 - 這是全新專案）

## Impact

### 前端 (client/)
- 新增 React + TypeScript 應用
- 新增 Tailwind CSS 樣式系統
- 新增 Context API 狀態管理

### 後端 (server/)
- 新增 Express.js + TypeScript API 服務
- 新增 SQLite 資料庫連接與操作
- 新增 RESTful API 路由

### 資料庫
- 新增 products 表
- 新增 orders 表
- 新增 order_items 表

### 依賴
- 前端：react, react-dom, react-router-dom, tailwindcss, axios
- 後端：express, better-sqlite3, cors, dotenv
- 開發工具：typescript, tsx, concurrently
