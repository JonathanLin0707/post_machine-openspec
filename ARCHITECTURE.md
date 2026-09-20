# 🏪 雜貨店 POS 系統 - 架構圖

> 準則詳見 `AGENTS.md`；行為修改前先讀 `openspec/specs/<scope>/spec.md`（共 10 個 scope），spec 與程式衝突以 spec 為準。

## 📦 專案整體架構 (Monorepo)

```
┌─────────────────────────────────────────────────────────────────┐
│                        grocery-pos-system                        │
│                    (Monorepo 結構 / 工作區)                       │
└─────────────────────────────────────────────────────────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
         ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   client/     │    │   server/     │    │   shared/     │
│  (前端 React) │    │  (後端 Node)  │    │  (共用型別*)  │
└───────────────┘    └───────────────┘    └───────────────┘
```

\* `shared/` 是編譯期型別單一來源（不參與 runtime 資料流），前後端只准 import `shared`。

---

## 🎨 前端架構 (Client)

```
┌─────────────────────────────────────────────────────────────────┐
│                        client/                                   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    src/                                  │   │
│  │                                                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │ pages/      │  │ components/ │  │ store/      │     │   │
│  │  │             │  │             │  │             │     │   │
│  │  │ POS.tsx     │  │ CartItem    │  │ CartContext │     │   │
│  │  │ ProductMgmt*│  │ ProductCard │  │ (.tsx 檔名, │     │   │
│  │  │ SalesReport │  │ Category    │  │ 內為 Zustand │     │   │
│  │  │ Orders.tsx  │  │ Filter,Layout│  │ useCartStore │     │   │
│  │  │             │  │ Toast, 3x   │  │ + persist)  │     │   │
│  │  │             │  │ Dialog      │  │             │     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │   │
│  │                                                           │   │
│  │  ┌─────────────┐  ┌─────────────┐                      │   │
│  │  │ services/   │  │ __tests__/  │  main.tsx + App.tsx │   │
│  │  │ api.ts      │  │ (Vitest)    │  (Router 入口)       │   │
│  │  │ databaseSvc │  │             │  index.css          │   │
│  │  └─────────────┘  └─────────────┘                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  建構工具：Vite ^8.3 (proxy /api → 127.0.0.1:8080)       │   │
│  │  樣式：Tailwind CSS 3.4                                  │   │
│  │  路由：react-router-dom v7                               │   │
│  │  圖表：chart.js                                          │   │
│  │  測試：Vitest + Testing Library                          │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

補充：

* `pages/` 共 4 頁：`POS.tsx`、`ProductManagement.tsx`（圖中縮寫為 `ProductMgmt*`）、`SalesReport.tsx`、`Orders.tsx`。無獨立 `DatabaseManagement.tsx` 頁面，資料庫匯出/匯入是 `Layout.tsx` 導覽列按鈕 + `ExportConfirmationDialog` / `ImportDialog` + `services/databaseService.ts`。
* `store/CartContext.tsx` 檔名為歷史遺留，內容是 Zustand `useCartStore` + `persist({ name: 'cart-storage' })`，非 React Context。
* `services/api.ts`：`baseURL: '/api'` 的 Axios 實例（含 token interceptor）。
* 路由（`App.tsx`）：`/`、`/cart` → POS；`/orders`、`/products`、`/reports`。

---

## 🖥️ 後端架構 (Server)

```
┌─────────────────────────────────────────────────────────────────┐
│                        server/                                   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    src/                                  │   │
│  │                                                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │ routes/     │  │ services/   │  │ database.ts │     │   │
│  │  │             │  │             │  │             │     │   │
│  │  │ products.ts │  │ csvExport   │  │ initDatabase│     │   │
│  │  │ orders.ts   │  │ Service     │  │ query()     │     │   │
│  │  │ reports.ts  │  │ databaseImp │  │ withTrans-  │     │   │
│  │  │ database.ts │  │ ortService  │  │ action()    │     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │   │
│  │                                                           │   │
│  │  ┌─────────────┐  ┌─────────────┐                      │   │
│  │  │ db/pool.ts  │  │ db/env.ts   │  index.ts (Express) │   │
│  │  │ (唯一建pool │  │ (先載入     │  /health + 靜態託管  │   │
│  │  │  處, SSL判斷)│  │ server/.env)│  client/dist        │   │
│  │  └─────────────┘  └─────────────┘                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  資料庫：PostgreSQL only (pg 連接池)                     │   │
│  │  連線資訊：只讀 DATABASE_URL（server/.env，不進版控）    │   │
│  │  表結構：products, orders, order_items                  │   │
│  │  遷移：server/scripts/migrate-sqlite-to-pg.ts            │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

關鍵約束（見 `AGENTS.md`）：

* ESM：`server/` 為 `"type": "module"`，import 本地 TS 一律加 `.js` 後綴。
* 存取一律經 `database.ts` 的 `query` / `withTransaction`；Schema 變更只加到 `SCHEMA_STATEMENTS`（`IF NOT EXISTS`，舊庫用 `ADD COLUMN IF NOT EXISTS` 補欄）。`initDatabase` 用 advisory lock 序列化 DDL。
* `initDatabase` 失敗時 server 保持啟動，`GET /health` 回 503——設計使然，不可改成 crash。
* 建單必須走 `withTransaction`：驗庫存 → 扣庫存 → 算 subtotal → 驗 discount（`0 <= discount <= subtotal`，否則 400 rollback）→ 寫單；`total = subtotal - discount` 存庫。報表一律讀已存 `total`。
* 測試共用同一 PG：`server/__tests__/helpers.ts`（`probeDatabase` 無庫 skip、`TRUNCATE ... RESTART IDENTITY CASCADE`），根目錄 `vitest.config.mts` 設 `fileParallelism: false`。

API（`src/index.ts` 掛載 `/api/...`）：

* `/api/products`、` /api/orders`（POST 建單 / GET 列表・`:id`）、`/api/reports/daily|monthly|top-products` + `POST /reports/csv-export`、`/api/database/export|import`，另有 `GET /health` 與 `client/dist` 靜態 + SPA fallback。

---

## 🔄 共用型別 (Shared)

> 唯一型別來源；改完跑 `npm run build --workspace=shared`（產出 `dist/`）。

```
┌─────────────────────────────────────────────────────────────────┐
│                        shared/                                   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    types.ts                              │   │
│  │                                                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │ Product     │  │ Order       │  │ OrderItem   │     │   │
│  │  │ id,name,    │  │ id,total,   │  │ orderId,    │     │   │
│  │  │ price,stock │  │ discount,   │  │ productId,  │     │   │
│  │  │ barcode,    │  │ tax,payment │  │ qty,unitPrice│     │   │
│  │  │ category    │  │ Method,status│  │ subtotal    │     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │   │
│  │                                                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │ CartItem    │  │ DailyReport │  │ MonthlyReport│     │   │
│  │  │ +DailyReport│  │ Response    │  │ TopProduct  │     │   │
│  │  │ OrderExport │  │             │  │ OrderExport │     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

實際匯出（`shared/types.ts`）：`Product`、`OrderItem`、`Order`、`OrderExport`、`CartItem`、`DailyReport`、`MonthlyReport`、`DailyReportResponse`、`TopProduct`。

---

## 📊 資料流程圖

```
┌─────────────────────────────────────────────────────────────────┐
│                        資料流程（shared 僅編譯期型別）             │
└─────────────────────────────────────────────────────────────────┘

    使用者操作
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  client/ (前端 React + Router)                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │  POS 收銀 │ 商品管理 │ 報表分析 │ 訂單查詢        │   │
│  │  (匯出/匯入在 Layout 導覽列，非獨立頁)            │   │
│  └─────────────────────────────────────────────────┘   │
│                      │                                   │
│                      ▼                                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  services/api.ts (Axios, baseURL /api)          │   │
│  │  services/databaseService.ts (匯出/匯入 JSON)   │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  server/ (後端 Express)                                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  routes/                                        │   │
│  │  products │ orders │ reports │ database         │   │
│  │  (無 cart.ts)                                   │   │
│  └─────────────────────────────────────────────────┘   │
│                      │                                   │
│                      ▼                                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  services/csvExportService (CSV)                │   │
│  │  services/databaseImportService (JSON 匯入)     │   │
│  └─────────────────────────────────────────────────┘   │
│                      │                                   │
│                      ▼                                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  database.ts query/withTransaction (pg)         │   │
│  │  ───────────────────────────────────────────── │   │
│  │  products │ orders │ order_items                │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

代表性端點：`GET /products`、`POST /orders`（`discount + payment_method`）、`GET /orders`、`GET /reports/daily|monthly|top-products`、`POST /reports/csv-export`、`GET /database/export`、`POST /database/import`。

---

## 🛠️ 技術棧總覽

```
┌─────────────────────────────────────────────────────────────────┐
│                        技術棧                                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  前端 (Client)                                                   │
│  ├── React 18 + React Router v7                                  │
│  ├── TypeScript 5.3+                                             │
│  ├── Vite ^8.3                                                   │
│  ├── Tailwind CSS 3.4                                            │
│  ├── Zustand 4.5 + persist (購物車)                              │
│  ├── Axios (HTTP, baseURL /api)                                  │
│  ├── chart.js (報表圖表)                                         │
│  └── Vitest + Testing Library (測試框架)                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  後端 (Server)                                                   │
│  ├── Node.js 18+                                                 │
│  ├── TypeScript 5.3+                                             │
│  ├── Express 4 + cors                                            │
│  ├── dotenv (server/.env → DATABASE_URL)                         │
│  ├── pg (PostgreSQL 連接池，唯一入口 db/pool.ts)                 │
│  ├── CSV 匯出 (csvExportService) / JSON 匯入 (databaseImportService)│
│  └── Vitest + supertest (測試；共用一庫，禁止平行)               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  共用 (Shared)                                                   │
│  ├── TypeScript 5.3+                                             │
│  └── 唯一型別來源 (tsc → dist/)                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  開發工具                                                        │
│  ├── concurrently (同時執行前後端)                               │
│  ├── tsx watch (後端 dev)                                        │
│  ├── eslint --max-warnings 0                                     │
│  └── openspec (規格管理，10 scopes)                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 專案目錄結構

```
grocery-pos-system/
├── client/                    # 前端工作區
│   ├── src/
│   │   ├── main.tsx            # Router 入口
│   │   ├── App.tsx             # 路由：/ /cart /orders /products /reports
│   │   ├── pages/              # POS.tsx, ProductManagement.tsx, SalesReport.tsx, Orders.tsx
│   │   ├── components/         # CartItem, ProductCard, CategoryFilter, Layout,
│   │   │                       # Toast, CheckoutConfirmationDialog,
│   │   │                       # ExportConfirmationDialog, ImportDialog
│   │   ├── store/              # CartContext.tsx (= Zustand useCartStore + persist)
│   │   ├── services/           # api.ts, databaseService.ts
│   │   ├── __tests__/          # Vitest 測試
│   │   └── index.css           # 樣式
│   ├── package.json
│   └── vite.config.ts          # /api proxy → 127.0.0.1:8080
│
├── server/                    # 後端工作區
│   ├── src/
│   │   ├── index.ts            # 伺服器入口 (/health, 靜態 client/dist)
│   │   ├── routes/             # products.ts, orders.ts, reports.ts, database.ts
│   │   ├── services/           # csvExportService.ts, databaseImportService.ts
│   │   ├── database.ts         # query / withTransaction / SCHEMA_STATEMENTS
│   │   ├── db/pool.ts          # 唯一建 pool 處 (DATABASE_URL + SSL 判斷)
│   │   ├── db/env.ts           # 預載 server/.env
│   │   └── seedData.ts         # 測試種子資料
│   ├── scripts/
│   │   └── migrate-sqlite-to-pg.ts   # SQLite→PostgreSQL 一次性遷移
│   ├── __tests__/              # helpers.ts + 各路由/服務測試
│   ├── package.json
│   └── tsconfig.json
│
├── shared/                    # 共用工作區（唯一型別來源）
│   ├── types.ts                # Product/Order(OrderItem)/CartItem/Report/Export 型別
│   └── package.json            # build: tsc → dist/
│
├── openspec/                   # 規格管理（共 10 scopes）
│   ├── specs/                  # cart-inventory-sync, checkout-confirmation-dialog,
│   │                           # database, database-import-dialog, export-confirmation-dialog,
│   │                           # order-discount, pos-checkout, product-management,
│   │                           # reports, sales-reporting
│   ├── changes/                # 進行中變更
│   └── config.yaml
│
├── package.json                # 根目錄 (Monorepo 設定)
├── vitest.config.mts           # fileParallelism: false（共用一庫，勿改平行）
├── AGENTS.md                   # AI coding 最小規則
├── README.md                   # 專案說明
└── .gitignore                  # Git 忽略設定
```

---

## 🔄 開發流程

```
┌─────────────────────────────────────────────────────────────────┐
│                        開發流程                                   │
└─────────────────────────────────────────────────────────────────┘

    1. 設計規格
         │
         ▼
    2. 更新 openspec/specs/<scope>/spec.md（共 10 scopes）
         │
         ▼
    3. 先更新 shared/types.ts + build（型別單一來源）
         │
         ▼
    4. 開發前後端功能（server 本地 import 加 .js；DB 經 query/withTransaction）
         │
         ▼
    5. 測試 (Vitest；server 共用一庫、sequential)
         │
         ▼
    6. Lint (eslint --max-warnings 0) + 建置 (npm run build)
         │
         ▼
    7. 部署（外部 PG + DATABASE_URL；init 失敗保持 503 不 crash）
```

---

## 📌 關鍵功能模組

| 模組 | 位置 | 說明 |
|------|------|------|
| **POS 收銀** | `client/src/pages/POS.tsx` | 購物車、結帳、折扣、付款方式 |
| **商品管理** | `client/src/pages/ProductManagement.tsx` | 商品 CRUD、分類篩選 |
| **銷售報表** | `client/src/pages/SalesReport.tsx` | 今日/每月報表、圖表（chart.js）、CSV 匯出 |
| **訂單查詢** | `client/src/pages/Orders.tsx` | 訂單列表、搜尋/狀態篩選、商品明細 Modal |
| **資料庫匯出/匯入** | `client/src/components/Layout.tsx` + `services/databaseService.ts` + `server/src/routes/database.ts` | 匯出 JSON 備份 / 匯入（replace/merge）；確認框為 `ExportConfirmationDialog` / `ImportDialog` |
| **庫存同步** | `client/src/store/CartContext.tsx`（Zustand `useCartStore` + persist） | 購物車數量上限受庫存約束；建單後由 server 扣庫存 |
| **訂單建立** | `server/src/routes/orders.ts` | `withTransaction` 建單，`0 <= discount <= subtotal`（見 `order-discount` spec） |
