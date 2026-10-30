# 雜貨店 POS 系統 - 技術架構文件

> 面向開發者與 AI Agent 的技術文件。使用者導向說明見 `../README.md`。
> 準則詳見 `../AGENTS.md`；行為修改前先讀 `../openspec/specs/<scope>/spec.md`（共 11 個 scope），spec 與程式衝突以 spec 為準。
> 既有圖表：`docs/architecture.html`。

**證據標記慣例**：本文件重要結論附 `File Path`、`Class`、`Method` 或 `檔案:行號` 作為證據。`UNKNOWN` 表示程式碼中無法確認；`INFERRED` 表示由程式碼推論、未經執行驗證。

---

## 0. 目錄

1. 完整專案結構
2. 技術架構總覽（圖表）
3. Entry Points
4. Core Modules、Class / Service / Method
5. 模組依賴關係
6. 設定檔分析
7. 外部系統依賴
8. 主要執行流程
9. 重要資料流
10. 測試與建置架構
11. 部署架構（Vercel）
12. UNKNOWN 與 INFERRED 項目

---

## 1. 完整專案結構

```
post_machine-openspec/
├── .github/workflows/ci.yml        # CI：npm ci → lint → test → build（Node 22）
├── .codegraph/ / .code-graph/      # 程式碼索引工具產物（非執行相依）
├── .memory/ / .openspec-store/     # AI 協作與規格工具產物
├── .opencode/                      # OpenSpec skills / commands（OpenCode 用）
├── api/index.mjs                   # Vercel Function 入口（re-export server/dist/index.js）
├── client/                         # 前端 workspace（Vite + React SPA）
│   ├── index.html
│   ├── vite.config.ts              # port 3000，/api proxy → 127.0.0.1:8080
│   ├── vitest.config.ts            # 前端測試設定
│   ├── eslint.config.js / tsconfig*.json / tailwind.config.js / postcss.config.js
│   └── src/
│       ├── main.tsx                # React 掛載入口（BrowserRouter）
│       ├── App.tsx                 # 路由表（/、/cart、/orders、/products、/reports）
│       ├── index.css / components/Layout.css
│       ├── pages/                  # POS.tsx、ProductManagement.tsx、SalesReport.tsx、Orders.tsx
│       ├── components/             # CartItem、ProductCard、CategoryFilter、Layout、Toast、
│       │                           # CheckoutConfirmationDialog/、ExportConfirmationDialog/、ImportDialog/
│       ├── store/CartContext.tsx   # Zustand useCartStore + persist（檔名為歷史遺留）
│       ├── services/               # api.ts（Axios）、databaseService.ts（JSON 備份匯出／匯入）
│       ├── test/setup.ts           # Vitest + jest-dom 初始化
│       └── __tests__/              # 8 支前端測試
├── server/                         # 後端 workspace（Express + pg，"type": "module"）
│   ├── .env.example                # 環境變數樣板（僅欄位名稱與佔位值）
│   ├── src/
│   │   ├── index.ts                # Express app 建立、路由掛載、/health、靜態託管
│   │   ├── database.ts             # Schema 初始化、query、withTransaction
│   │   ├── db/pool.ts              # 唯一 pg.Pool 建立處，SSL 判斷
│   │   ├── db/env.ts               # 預載 server/.env（dotenv）
│   │   ├── seedData.ts             # 種子資料（31 行）
│   │   ├── routes/                 # products.ts、orders.ts、reports.ts、database.ts
│   │   └── services/               # csvExportService.ts、databaseImportService.ts
│   ├── scripts/migrate-sqlite-to-pg.ts  # 一次性 SQLite → PostgreSQL 遷移
│   └── __tests__/                  # 10 支後端測試 + helpers.ts
├── shared/                         # 共用型別 workspace（唯一型別來源）
│   ├── types.ts                    # Product、Order、OrderItem、CartItem、報表與匯出型別
│   ├── package.json                # main/types 指向 dist/，build = tsc
│   └── tsconfig.json
├── openspec/                       # 行為規格（specs/ 11 scopes、changes/ 進行中、archive/）
├── docs/
│   ├── ARCHITECTURE.md             # 本文件
│   └── architecture.html           # 架構圖（HTML）
├── data/                           # 本地資料目錄（非程式碼）
├── vercel.json                     # Vercel 建置、輸出與 rewrites 設定
├── vitest.config.mts               # 根目錄後端測試設定（fileParallelism: false）
├── package.json                    # npm workspaces 根設定與根 scripts
├── package-lock.json
├── opencode.jsonc
├── AGENTS.md                       # AI coding 最小規則
└── README.md                       # 使用者導向說明
```

---

## 2. 技術架構總覽（圖表）

> 以下為既有架構圖（保留原分析內容）。若與後續章節衝突，以後續章節與程式碼為準。

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

API（`server/src/index.ts:58-61` 掛載；完整端點以下表為準）：

| Method | Path | Handler（檔案:行） | 說明 |
|--------|------|------|------|
| GET | `/api/products` | `routes/products.ts:31` | 商品列表 |
| GET | `/api/products/:id` | `routes/products.ts:72` | 單一商品 |
| POST | `/api/products` | `routes/products.ts:87` | 新增商品 |
| POST | `/api/products/cart` | `routes/products.ts:124` | 加入購物車時扣庫存（直接 `UPDATE`，見 §12） |
| PUT | `/api/products/:id` | `routes/products.ts:154` | 更新商品 |
| DELETE | `/api/products/:id` | `routes/products.ts:222` | 刪除商品 |
| POST | `/api/orders` | `routes/orders.ts:92` | 建單（`withTransaction`，見 §8） |
| GET | `/api/orders` | `routes/orders.ts:210` | 訂單列表（含 items） |
| GET | `/api/orders/:id` | `routes/orders.ts:221` | 單筆訂單 |
| GET | `/api/reports/daily` | `routes/reports.ts:10` | 今日彙總 + 近 30 天圖表資料 |
| GET | `/api/reports/monthly` | `routes/reports.ts:57` | 近 12 個月統計 |
| GET | `/api/reports/top-products` | `routes/reports.ts:89` | 熱銷商品（預設前 10） |
| GET | `/api/reports/top-products/custom` | `routes/reports.ts:133` | 熱銷商品（`?limit=`） |
| POST | `/api/reports/csv-export` | `routes/reports.ts:175` | 訂單 CSV（UTF-8 BOM，`\r\n`） |
| GET | `/api/database/export` | `routes/database.ts:12` | JSON 備份下載 |
| POST | `/api/database/import` | `routes/database.ts:44` | JSON 備份匯入（`mode`: `replace`／`merge`） |
| GET | `/health` | `index.ts:64` | 200 `{status:'ok'}`；DB 未就緒 503 |
| `*` | 其他路徑 | `index.ts:73-78` | `client/dist` 靜態檔 + SPA fallback 到 `index.html` |

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
│  └── openspec (規格管理，11 scopes)                              │
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
├── openspec/                   # 規格管理（共 11 scopes）
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
    2. 更新 openspec/specs/<scope>/spec.md（共 11 scopes）
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

---

## 3. Entry Points

| 類型 | 位置 | 說明 |
|------|------|------|
| 前端掛載 | `client/src/main.tsx` | 以 `BrowserRouter` 包住 `App`（`main.tsx:9-11`） |
| 前端路由 | `client/src/App.tsx:48-53` | `/`、`/cart` → `POS`；`/orders`、`/products`、`/reports` |
| 後端應用 | `server/src/index.ts:11`（`app`）、`:97`（`export default app`） | Express app 定義與匯出，可被測試與 Vercel 共用 |
| 後端啟動 | `server/src/index.ts:88-95` | 僅當 `process.argv[1]` 為本檔時 `app.listen(PORT, '0.0.0.0')`；`PORT` 預設 `8080`（`:12`） |
| 後端 dev / start | `server/package.json` scripts | `dev` = `tsx watch src/index.ts`；`start` = `node dist/index.js` |
| Vercel Function | `api/index.mjs:9-13` | `import app from '../server/dist/index.js'`，`export default handler` 轉呼叫 Express app |
| 一次性遷移 | `server/scripts/migrate-sqlite-to-pg.ts`（`main()` L82） | SQLite → PostgreSQL；讀 `SQLITE_PATH`（預設 `data/grocery.db`，L85） |
| 型別建置 | `shared/package.json` | `main`/`types` 指向 `dist/`，`build` = `tsc` |

---

## 4. Core Modules、Class / Service / Method

### 4.1 後端

| 模組 / 符號 | 證據 | 職責 |
|------|------|------|
| `initDatabase()` | `server/src/database.ts:82` | 取得連線 → `pg_advisory_lock(42763390)`（L25、L87）→ `runStatements` → 解鎖 |
| `runStatements()` | `database.ts:27` | 包在 `BEGIN`/`COMMIT`，失敗 `ROLLBACK` |
| `SCHEMA_STATEMENTS` | `database.ts:43-80` | `CREATE TABLE IF NOT EXISTS`、`ALTER TABLE ... ADD COLUMN IF NOT EXISTS discount`、索引 |
| `query()` | `database.ts:99` | 經 `pool.query` 執行單句 SQL，回傳 `{rows,rowCount}` |
| `withTransaction()` | `database.ts:107` | 取 client、`BEGIN`，以 `asQueryable(client)`（L13）傳給 callback，`COMMIT` / `ROLLBACK` |
| `pool` | `server/src/db/pool.ts:19` | 唯一 `pg.Pool`：`max: 10`、`idleTimeoutMillis: 30000`、`connectionTimeoutMillis: 5000` |
| `requiresSsl()` | `pool.ts:6` | `PGSSLMODE=require|verify-full` 或連線字串含 `supabase.co`／`supabase.com` 時回傳 true |
| `checkConnection()` | `pool.ts:27` | `SELECT 1`；由遷移腳本與測試 helper 使用 |
| `env.ts` | `server/src/db/env.ts` | 先於 pool 載入 `server/.env`（`import './env.js'`，`pool.ts:1`） |
| `describeDbError()` | `server/src/index.ts:20` | 組裝 DB 初始化錯誤訊息（僅記錄，不含密碼） |
| `databaseReady` 旗標 | `index.ts:18, 42-55` | `initDatabase()` 成功才設為 true；失敗 server 仍啟動，`/health` 回 503 |
| `mapOrder()` | `routes/orders.ts:76` | 將 DB row 轉為回應物件（`payment_method`、`created_at` 為 snake_case） |
| `POST /api/orders` | `routes/orders.ts:92-207` | 驗證 items / `payment_method`（`cash`、`credit_card`、`mobile_payment`）/ `discount`；於 `withTransaction` 內驗庫存、扣庫存、算 subtotal、驗 discount（L165）、寫單 |
| `GET /api/orders[/:id]` | `routes/orders.ts:210, 221` | 以 `GET_ALL_ORDERS_SQL` / `GET_ORDER_BY_ID_SQL`（`json_agg` 組 items） |
| `GET /api/products*`、`POST/PUT/DELETE /api/products*` | `routes/products.ts:31-237` | 商品 CRUD；`UPDATE_PRODUCT_SQL`（L12）供 `/cart` 使用 |
| `POST /api/products/cart` | `routes/products.ts:124` | 直接扣庫存並回傳商品；前端目前無呼叫點（見 §12） |
| `GET /api/reports/daily` | `routes/reports.ts:10` | 今日彙總以 `(created_at AT TIME ZONE 'UTC')::date` 比對；近 30 天圖表 |
| `GET /api/reports/monthly` | `reports.ts:57` | 近 12 個月彙總 |
| `GET /api/reports/top-products` | `reports.ts:89, 133` | 依 `oi.subtotal * (o.total / order_totals.subtotal)` 分攤實收（含折扣）；`/custom` 接受 `limit` |
| `POST /api/reports/csv-export` | `reports.ts:175` | `CsvExportService.fetchAllOrders()` → `formatAsCSV()` → attachment |
| `CsvExportService` | `server/src/services/csvExportService.ts:4` | `fetchAllOrders()`、`formatAsCSV()`（前綴 BOM `﻿`，L72，以 `\r\n` 連接）、`exportToCSV()`（L78，無呼叫點） |
| `GET /api/database/export` | `routes/database.ts:12` | `Promise.all` 讀 `products`、`orders`、`order_items`，回傳 JSON 附件 |
| `POST /api/database/import` | `routes/database.ts:44` | 委派 `DatabaseImportService.importBackup(mode, backup)` |
| `DatabaseImportService` | `services/databaseImportService.ts:264` | 建構子注入 `TransactionRunner`（預設 `withTransaction`，L267）；`importBackup()`（L271）驗 mode、`validateBackup()`（L81）、在交易內寫入 |
| `replace` 模式 | `databaseImportService.ts:280` | `TRUNCATE products, orders, order_items RESTART IDENTITY CASCADE` 後以 `INSERT_*` 寫入 |
| `merge` 模式 | `databaseImportService.ts:230, 285-287` | 以 `UPSERT_*` 寫入 |
| `HttpError` | `databaseImportService.ts:11`、`orders.ts:4`（同名區域類別） | 攜帶 HTTP status 的錯誤型別 |
| `seedData.ts` | `server/src/seedData.ts` | 種子資料（31 行）；全專案無 import，用途 UNKNOWN |

### 4.2 前端

| 模組 / 符號 | 證據 | 職責 |
|------|------|------|
| `useCartStore` | `client/src/store/CartContext.tsx:21` | Zustand store + `persist`（`name: 'cart-storage'`，L117）；actions：`addItem`、`removeItem`、`updateQuantity`、`increaseQuantity(productId, stock?)`、`decreaseQuantity`、`clearCart` |
| `api` (Axios) | `client/src/services/api.ts` | `baseURL: '/api'`、`timeout: 10000`；request interceptor 讀 `localStorage.token`；401 時清除 token 並導向 `/login`（見 §12） |
| `exportDatabase()` / `importDatabase(file, mode)` / `extractImportError()` | `client/src/services/databaseService.ts:6, 32, 38` | 匯出下載 JSON；匯入 `timeout: 60000` |
| `App` 結帳 | `client/src/App.tsx:18` | `api.post('/orders', ...)` |
| POS 頁 | `client/src/pages/POS.tsx:33` | `GET /products` |
| 商品管理頁 | `client/src/pages/ProductManagement.tsx:27, 46, 57, 59` | `GET`、`DELETE`、`PUT`、`POST /products` |
| 訂單頁 | `client/src/pages/Orders.tsx:126` | `GET /orders` |
| 報表頁 | `client/src/pages/SalesReport.tsx:35-37, 109` | `GET /reports/daily|monthly|top-products`；`POST /reports/csv-export` |
| `Layout` | `client/src/components/Layout.tsx` | 導覽列；匯出／匯入按鈕觸發 `ExportConfirmationDialog`、`ImportDialog` |

### 4.3 共用型別

| 型別 | 位置 | 用途 |
|------|------|------|
| `Product`、`OrderItem`、`Order`、`OrderExport`、`CartItem`、`DailyReport`、`MonthlyReport`、`DailyReportResponse`、`TopProduct` | `shared/types.ts` | 前後端唯一型別來源（`client/package.json`、`server/package.json` 皆依賴 `"shared": "*"`） |

---

## 5. 模組依賴關係

```
client/pages ──► client/components ──► client/store (CartContext.tsx) ──► shared (CartItem)
     │                  │
     └──────────────► client/services (api.ts, databaseService.ts) ──HTTP /api──┐
                                                                                ▼
server/src/index.ts ──► routes/products.ts ─────────────────────────► database.ts ──► db/pool.ts ──► db/env.ts
                   ├──► routes/orders.ts ───────────────────────────► database.ts
                   ├──► routes/reports.ts ──► services/csvExportService.ts ──► database.ts
                   └──► routes/database.ts ──► services/databaseImportService.ts ──► database.ts
                   └──► client/dist（靜態檔，index.ts:73）

shared/types.ts ◄── client（import 'shared'）、server（import 'shared'）  [編譯期，無 runtime 流量]
```

依據：`server/src/routes/database.ts:1-6`、`routes/reports.ts:1-3`、`routes/orders.ts:2`、`database.ts:1-2`、`index.ts:3-9`、`client/src/store/CartContext.tsx:4`。

---

## 6. 設定檔分析

| 檔案 | 重點 |
|------|------|
| `package.json`（根） | npm workspaces：`client`、`server`、`shared`；`engines.node: 22.x`；`dev` 以 `concurrently` 同時啟動前後端；`build` = `npm run build --workspaces`；`test` = `test:client`（僅前端） |
| `server/package.json` | `"type": "module"`；`dev`/`build`/`start`/`lint`；**無 `test` script**（README 已註明） |
| `client/package.json` | `dev`=`vite`、`build`=`tsc && vite build`、`lint`、`test`=`vitest run`、`preview` |
| `shared/package.json` | `main: ./dist/types.js`、`types: ./dist/types.d.ts`、`build: tsc` |
| `client/vite.config.ts` | `server.port: 3000`；`/api` proxy → `http://127.0.0.1:8080`（固定值，未讀環境變數）；`optimizeDeps.exclude: ['sql.js']` |
| `client/vitest.config.ts` | 前端測試設定（`client/src/test/setup.ts` 載入 jest-dom） |
| `vitest.config.mts`（根） | `fileParallelism: false`（後端共用一庫，禁止平行） |
| `vercel.json` | `framework: null`、`buildCommand` 依序 build `shared` → `client` → `server`、`outputDirectory: client/dist`、`functions["api/index.mjs"].includeFiles: server/dist/**`、rewrites（`/api/*`、`/health` → 函式；其餘 → `index.html`） |
| `.github/workflows/ci.yml` | Node 22、`npm ci` → `npm run lint` → `npm test` → `npm run build` |
| `server/.env.example` | 欄位樣板：`DATABASE_URL`、`PORT`、`NODE_ENV`（值已省略，見 §6.1） |
| `.gitignore`、`server/.gitignore` | 忽略規則；`server/dist` 由建置產生、不納入版控（依 `README.md` 部署章節說明） |

### 6.1 環境變數（欄位名稱、用途、預設、格式）

| 名稱 | 必填 | 用途 | 預設 | 格式範例（佔位） | 證據 |
|------|------|------|------|------|------|
| `DATABASE_URL` | 是 | PostgreSQL 連線字串 | 無 | `postgresql://<user>:<password>@<host>:<port>/<database>` | `pool.ts:4` |
| `PORT` | 否 | HTTP 監聽埠 | `8080` | `<port>` | `index.ts:12` |
| `NODE_ENV` | 否 | 環境別 | 無 | `development` | 樣板有；程式中讀取點 UNKNOWN |
| `PGSSLMODE` | 否 | 強制 SSL（`require`／`verify-full`） | 未設 | `require` | `pool.ts:8-9` |
| `SQLITE_PATH` | 否（僅遷移） | 遷移來源 SQLite 檔 | `data/grocery.db` | `<path-to-sqlite-file>` | `migrate-sqlite-to-pg.ts:85` |

> 安全：`DATABASE_URL` 含憑證，僅存於 `server/.env`（已被 `server/.gitignore` 忽略）與部署平台的環境變數中，不得寫入文件或版控。

---

## 7. 外部系統依賴

| 系統 | 依賴方式 | 程式位置 |
|------|------|------|
| PostgreSQL（外部受管） | `pg.Pool`，唯一連線入口 | `server/src/db/pool.ts` |
| Supabase（偵測） | 連線字串網域判斷，自動 SSL（`rejectUnauthorized: false`） | `pool.ts:14-15` |
| Vercel | Serverless Function + 靜態 CDN | `vercel.json`、`api/index.mjs` |
| 瀏覽器 `localStorage` | Zustand `persist` 購物車（`cart-storage`）；`token` 讀取 | `CartContext.tsx:117`、`api.ts` |
| GitHub Actions | CI（lint／test／build） | `.github/workflows/ci.yml` |
| Neon / Railway 等 | 文件所述可選 PostgreSQL 代管；程式碼無專屬判斷，需 `PGSSLMODE=require` | `README.md`、`pool.ts` |

本系統不串接金流；`payment_method` 僅作紀錄（`routes/orders.ts:99`）。

---

## 8. 主要執行流程

**8.1 啟動與 DB 初始化**
1. `server/src/index.ts` 載入 `routes/*`、`database.ts`（會先載入 `db/env.ts`）。
2. 模組頂層呼叫 `initDatabase()`（`index.ts:42`）；非阻塞，成功設 `databaseReady = true`，失敗僅記錄。
3. `isMain` 為真時 `app.listen`。`GET /health` 在 DB 未就緒時回 503（`index.ts:64-68`）。

**8.2 結帳建單（`POST /api/orders`，`routes/orders.ts:92`）**
1. 驗證 `items`（非空陣列）、`payment_method`、`discount`（非負數）→ 失敗回 400，未開交易。
2. `withTransaction`（`database.ts:107`）內，逐項：`SELECT products` → 不存在 404 → 庫存不足 400 → `UPDATE products SET stock = stock - qty` → 累加 subtotal。
3. `discount > subtotal` → 400，整單 rollback（`orders.ts:165-167`）。
4. `tax = 0`；`total = subtotal - discount`（`orders.ts:169-171`）。
5. `INSERT orders` → 逐筆 `INSERT order_items` → 以 `GET_ORDER_BY_ID_SQL` 讀回 → `201` + `mapOrder`。
6. 任一步驟拋錯 → `ROLLBACK`，回應 `HttpError` 狀態或 500。

**8.3 資料庫匯入（`POST /api/database/import`）**
1. 前端 `databaseService.importDatabase(file, mode)` 讀取 JSON，送 `{ mode, backup }`（timeout 60s）。
2. `DatabaseImportService.importBackup`：驗 mode → `validateBackup` 驗每筆欄位型別（`databaseImportService.ts:20-80` 工具函式）。
3. 交易內：`replace` 先 `TRUNCATE … RESTART IDENTITY CASCADE`；`merge` 以 `UPSERT_*` 寫入。
4. 回傳 `{success, products, orders, orderItems}`（`ImportSummary`）。

**8.4 CSV 匯出（`POST /api/reports/csv-export`）**
`fetchAllOrders()` → `formatAsCSV()`（BOM + `\r\n`）→ `Content-Disposition: attachment; filename="orders_<date>.csv"`。

**8.5 Schema 初始化**
`pg_advisory_lock` 序列化 DDL → 單一交易執行 `SCHEMA_STATEMENTS` → 解鎖（`database.ts:82-97`）。

---

## 9. 重要資料流

**9.1 資料表（`server/src/database.ts:43-80`）**

| 表 | 主要欄位 | 約束 |
|------|------|------|
| `products` | `id BIGSERIAL`、`name`、`price`、`barcode`、`category`、`stock INT DEFAULT 0`、`image_url`、時間戳 | `name UNIQUE`、`barcode UNIQUE`；索引 barcode、category |
| `orders` | `id`、`total`、`tax DEFAULT 0`、`discount DEFAULT 0`、`payment_method`、`status DEFAULT 'completed'`、`created_at` | 索引 `created_at` |
| `order_items` | `id`、`order_id`、`product_id`、`quantity`、`unit_price`、`subtotal` | FK `order_id → orders` ON DELETE CASCADE；FK `product_id → products` ON DELETE RESTRICT |

**9.2 金額不變量**（實作依據 `routes/orders.ts`；規格見 `openspec/specs/order-discount/spec.md`，本次未逐條比對）
- `subtotal = Σ(unit_price × quantity)`；`0 <= discount <= subtotal`；`total = subtotal - discount`（tax 目前恆為 0）。
- 報表一律讀已存 `orders.total`，不重算。`top-products` 以比例分攤實收（`reports.ts:133-175`）。

**9.3 庫存來源**
- 伺服器為權威：`POST /api/orders` 在交易內扣庫存。
- 前端購物車 `useCartStore` 以 `stock` 上限限制數量（UI 層）；`localStorage` 持久化。

**9.4 前端狀態**
- 購物車：Zustand（`cart-storage`）；其他頁面資料為元件內 `useState` + Axios 直接請求（INFERRED，未逐頁確認）。

---

## 10. 測試與建置架構

| 項目 | 內容 | 證據 |
|------|------|------|
| 後端測試 | Vitest + supertest；`server/__tests__/` 共 10 支（含 `helpers.ts`） | `server/__tests__/` |
| 測試 DB | 共用同一 PostgreSQL；`probeDatabase` 無庫則 skip；`TRUNCATE … RESTART IDENTITY CASCADE` 重置 | `helpers.ts` |
| 測試並行 | `fileParallelism: false` | `vitest.config.mts` |
| 後端測試執行 | `npx vitest run server/__tests__`（需 PG） | `README.md`（server 無 `test` script） |
| 前端測試 | Vitest + Testing Library + jsdom；`client/src/__tests__/` 共 8 支 | `client/package.json`、`client/src/test/setup.ts` |
| Lint | `eslint --max-warnings 0`（client、server）；shared 無 lint | `client/package.json`、`server/package.json` |
| 型別建置 | `shared` 先 `tsc → dist/`；client 與 server 依賴其產物 | `shared/package.json` |
| 根建置 | `npm run build --workspaces`（順序依 workspaces 宣告：client → server → shared，INFERRED 可能因 `shared/dist` 未就緒而失敗；Vercel 的 buildCommand 已先建 shared） | `package.json`、`vercel.json` |
| CI | `npm ci` → `npm run lint` → `npm test` → `npm run build`，Node 22 | `.github/workflows/ci.yml` |

---

## 11. 部署架構（Vercel）

- 單一 Vercel 專案，根目錄部署；前端靜態檔由 `client/dist` 提供，`/api/*`、`/health` 導向 `api/index.mjs`（`vercel.json`）。
- Function 內 Express 使用 `server/dist`（`includeFiles`）。
- 每個 Function 實例 `pg.Pool` 最多 10 連線（`pool.ts:21`）；應使用 pooler 連線字串以免耗盡資料庫連線數（見 `README.md`）。
- `initDatabase()` 於模組載入時執行（`index.ts:42`），每個冷啟動實例皆會執行一次 schema 檢查（advisory lock 保證序列化）。

---

## 12. UNKNOWN 與 INFERRED 項目

### 12.1 UNKNOWN（本次分析無法確認）

| # | 項目 | 說明 |
|---|------|------|
| U1 | `NODE_ENV` 讀取點 | 僅見於 `server/.env.example`，`server/src`、`server/scripts`、`client/src` 未讀取 |
| U2 | `seedData.ts` 用途 | 全專案無 import |
| U3 | `checkConnection()` 在後端執行期的使用 | 僅遷移腳本與測試 helper 使用 |
| U4 | `CsvExportService.exportToCSV()` | 無呼叫點（`csvExportService.ts:78`） |
| U5 | `/login` 路由 | `client/src/services/api.ts` 401 時導向 `/login`，但 `App.tsx:48-53` 未定義此路由；後端亦無認證機制 |
| U6 | `Product` 回應格式 | `products.ts` 之 `toProductResponse` 完整映射未逐行確認 |

### 12.2 INFERRED（推論，未經執行驗證；建議確認後再修正）

| # | 推論 | 證據 | 影響 |
|---|------|------|------|
| I1 | `products.ts:146` 以 SQLite 錯誤訊息 `FOREIGN KEY constraint failed` 判斷 404，PostgreSQL 錯誤訊息不同，該分支不會命中 | `products.ts:146`；`database.ts` 已改為 PG | 外鍵錯誤會回 500 而非 404 |
| I2 | Express 錯誤中介層以 3 個參數宣告（`(err, req, res)`），Express 需 4 個參數才視為錯誤處理器 | `index.ts:81` | 錯誤可能不被此中介層接手，回應格式不如預期 |
| I3 | `shared/types.ts` 與實際 JSON 不一致：型別為 `id: string`、`paymentMethod`、`createdAt: Date`；執行期為 numeric id、`payment_method`、`created_at` 字串 | `shared/types.ts`；`routes/orders.ts:76-87` | 型別無法反映真實回應，前端可能存在不一致 |
| I4 | CI 的 `npm test` 只跑前端測試（根 `test` → `test:client`），後端測試未進 CI | `package.json`、`ci.yml` | 後端回歸不會被 CI 攔下 |
| I5 | `POST /api/products/cart` 與 `POST /api/orders` 皆會扣庫存；目前前端無 `/products/cart` 呼叫，若未來同時使用將重複扣減 | `products.ts:124`、`orders.ts:145`；前端 grep 無呼叫 | 目前無影響，為維護風險 |
| I6 | `requiresSsl` 使用 `rejectUnauthorized: false`，不驗證伺服器憑證 | `pool.ts:24` | 有中間人風險；屬已知設計取捨，建議評估 |
| I7 | 根 `npm run build --workspaces` 依 workspaces 宣告順序建置，`client`/`server` 可能早於 `shared` 產出 `dist/` | `package.json` workspaces 順序；`vercel.json` 已改為先建 shared | 本機全新 clone 可能建置失敗（需先 `npm run build --workspace=shared`） |
| I8 | `shared/dist` 在 git 中有追蹤紀錄，但目前工作目錄為刪除狀態 | 本次 `git status` 快照 | 需確認是否應追蹤或改由建置產生 |
