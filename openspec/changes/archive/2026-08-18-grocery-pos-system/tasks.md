## 1. 專案初始化與環境設定

- [x] 1.1 建立 Monorepo 根目錄結構與 package.json (npm workspaces)
- [x] 1.2 初始化前端專案 (client/)：建立 React + TypeScript + Vite 專案
- [x] 1.3 初始化後端專案 (server/)：建立 Express + TypeScript 專案
- [x] 1.4 設定 Tailwind CSS 收銀台主題（大按鈕、高對比）
- [x] 1.5 建立共用類型定義 (shared/types.ts)
- [x] 1.6 設定 concurrently 同時啟動前後端開發伺服器

## 2. 資料庫建立

- [x] 2.1 建立 SQLite 資料庫連接模組 (server/src/database.ts)
- [x] 2.2 建立 products 資料表 Schema 與索引
- [x] 2.3 建立 orders 資料表 Schema
- [x] 2.4 建立 order_items 資料表 Schema 與外鍵約束
- [x] 2.5 建立資料庫初始化腳本 (npm run db:init)
- [x] 2.6 插入測試商品資料

## 3. 商品管理 API

- [x] 3.1 建立商品路由模組 (server/src/routes/products.ts)
- [x] 3.2 實現 GET /api/products 商品列表 API（支援搜尋、分類篩選）
- [x] 3.3 實現 POST /api/products 新增商品 API（含輸入驗證）
- [x] 3.4 實現 PUT /api/products/:id 更新商品 API
- [x] 3.5 實現 DELETE /api/products/:id 刪除商品 API
- [x] 3.6 實現錯誤處理中間件（統一錯誤格式）

## 4. 訂單 API

- [x] 4.1 建立訂單路由模組 (server/src/routes/orders.ts)
- [x] 4.2 實現 POST /api/orders 創建訂單 API（含庫存扣減）
- [x] 4.3 實現 GET /api/orders 訂單列表 API
- [x] 4.4 實現 GET /api/orders/:id 訂單明細 API

## 5. 報表 API

- [x] 5.1 建立報表路由模組 (server/src/routes/reports.ts)
- [x] 5.2 實現 GET /api/reports/daily 每日銷售報表 API
- [x] 5.3 實現 GET /api/reports/monthly 每月銷售報表 API
- [x] 5.4 實現 GET /api/reports/top-products 熱銷商品排行 API

## 6. 前端共用組件

- [x] 6.1 建立 API 服務層 (client/src/services/api.ts)
- [x] 6.2 建立購物車 Context 與 Reducer (client/src/store/CartContext.tsx)
- [x] 6.3 建立 ProductCard 商品卡片組件
- [x] 6.4 建立 CartItem 購物車項目組件
- [x] 6.5 建立 CategoryFilter 分類篩選組件
- [x] 6.6 建立 Toast 通知組件

## 7. 收銀台主頁面 (POS)

- [x] 7.1 建立 POS 頁面佈局（左中右三欄）
- [x] 7.2 實作商品列表區（分類 tabs + 商品卡片網格）
- [x] 7.3 實作購物車區（商品列表 + 數量調整 + 清空按鈕）
- [x] 7.4 實作結帳面板（小計、稅額、總計、支付方式、結帳按鈕）
- [x] 7.5 整合購物車 Context 實現即時金額計算
- [x] 7.6 實現商品搜尋加入購物車功能

## 8. 商品管理頁面

- [x] 8.1 建立商品管理頁面佈局
- [x] 8.2 實作商品列表表格（搜尋、篩選、排序）
- [x] 8.3 實作新增商品表單（含表單驗證）
- [x] 8.4 實作編輯商品功能（Modal 或側邊欄）
- [x] 8.5 實作刪除商品功能（確認對話框）

## 9. 銷售報表頁面

- [x] 9.1 建立報表頁面佈局
- [x] 9.2 實作今日銷售摘要卡片
- [x] 9.3 整合 Chart.js 實作每日銷售折線圖
- [x] 9.4 實作每月銷售長條圖
- [x] 9.5 實作熱銷商品 TOP 10 排行列表
- [x] 9.6 實作 CSV 匯出功能

## 10. 測試與優化

- [x] 10.1 設定 Vitest 測試框架
- [x] 10.2 撰寫商品管理 API 單元測試
- [x] 10.3 撰寫訂單 API 單元測試
- [x] 10.4 撰寫購物車 Context 單元測試
- [x] 10.5 效能優化：程式碼分割與懶載入
- [x] 10.6 UI 細節調整與跨瀏覽器測試
