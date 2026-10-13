# POS 系統 (Point of Sale)

這是一個完整的收銀系統（POS），包含前端 React UI、後端 Node.js API 與共用 TypeScript 型別定義。

> 架構總覽見 `ARCHITECTURE.md`；AI 協作最小規則見 `AGENTS.md`；行為規格以 `openspec/specs/<scope>/spec.md`（共 10 個 scope）為準。

## 專案結構

### 前端 (`client`)

| 目錄 | 說明 |
|------|------|
| `src/components/` | React UI 元件：購物車（CartItem）、產品卡片、分類篩選、佈局框架（Layout）、通知提示，以及結帳確認／匯出確認／匯入對話框 |
| `src/pages/` | 4 個頁面：`POS.tsx`（收銀）、`ProductManagement.tsx`（商品 CRUD）、`SalesReport.tsx`（報表）、`Orders.tsx`（訂單查詢）。資料庫匯出／匯入不在獨立頁，由 `Layout` 導覽列按鈕觸發 |
| `src/services/` | `api.ts`（Axios，`baseURL: '/api'`）與 `databaseService.ts`（JSON 備份匯出／匯入） |
| `src/store/` | `CartContext.tsx`（檔名歷史遺留，內容為 Zustand `useCartStore` + `persist`） |

### 後端 (`server`)

| 目錄 | 說明 |
|------|------|
| `src/routes/` | API 路由：`products.ts`、`orders.ts`、`reports.ts`、`database.ts`（匯出／匯入） |
| `src/database.ts` | PostgreSQL 連線管理與 Schema 初始化，提供 `query` / `withTransaction` 存取介面 |
| `src/db/pool.ts` | PostgreSQL 連接池（`pg.Pool`），透過 `DATABASE_URL` 取得連線資訊（唯一建 pool 處，含 SSL 判斷） |
| `src/db/env.ts` | 預先載入 `server/.env`（ESM import 提升問題的解法） |
| `src/services/` | `csvExportService.ts`（銷售報告 CSV）與 `databaseImportService.ts`（JSON 備份匯入，`replace`／`merge`） |
| `src/seedData.ts` | 測試種子資料 |
| `server/scripts/migrate-sqlite-to-pg.ts` | 一次性遷移腳本：將既有 SQLite 資料匯入 PostgreSQL |

### 共用型別 (`shared`)

| 目錄 | 說明 |
|------|------|
| `types.ts` / `dist/` | 唯一型別來源：Product、Order（含 OrderItem）、CartItem、Daily／Monthly 報表、TopProduct、OrderExport 等；改完跑 `npm run build --workspace=shared` |

## 主要功能

- **收銀介面**：搜尋或分類瀏覽商品，加入購物車（Zustand，受庫存約束），可輸折扣金額，經結帳確認框後選擇付款方式（現金、信用卡、行動支付）建立訂單（`0 <= discount <= subtotal`，否則 400 且整單 rollback）
- **商品管理**：商品 CRUD、關鍵字搜尋、分類篩選
- **訂單查詢**：訂單列表、ID／商品名搜尋、狀態篩選、商品明細 Modal
- **銷售報表**：今日彙總、近 30 天每日圖表、近 12 個月每月統計、熱銷 Top 10 商品
- **CSV 匯出**：將訂單匯出為 CSV（`POST /api/reports/csv-export`，含 UTF-8 BOM）
- **資料庫管理**：使用 PostgreSQL 儲存產品、訂單等資料；提供 JSON 備份匯出（`GET /api/database/export`）與匯入（`POST /api/database/import`，`mode` 為 `replace` 或 `merge`）

## 技術棧

- **前端**：React 18 + React Router v7 + TypeScript 5.3 + Vite ^8.3 + Tailwind CSS 3.4 + Zustand 4.5（persist）+ Axios + chart.js + Vitest
- **後端**：Node.js 18+ + TypeScript 5.3 + Express 4 + PostgreSQL（`pg` 連接池）+ dotenv + cors；測試用 Vitest + supertest（共用一庫，禁止平行）
- **共用型別**：TypeScript（`tsc → dist/`）

## 開發者設定

### 環境變數

後端透過 `DATABASE_URL` 連接 PostgreSQL（必填）。本地開發請在 `server/` 下建立 `.env`：

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
PORT=8080
NODE_ENV=development
```

（參考 `server/.env.example`。）

### 本地 PostgreSQL（Docker）

```
docker run --name grocery-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16
```

### 啟動

```
npm install            # 根目錄安裝（含 workspaces）
npm run dev            # 同時啟動前後端（concurrently）
# 或各自啟動：
npm run dev --workspace=client   # Vite，預設 :3000，/api proxy → 127.0.0.1:8080
npm run dev --workspace=server   # tsx watch，預設 :8080
```

`/health` 回傳 `200 { status: 'ok' }`；資料庫未就緒時回傳 `503 { status: 'unavailable' }`（保持啟動是設計，不可改成 crash）。

### 測試

```
npx vitest run server/__tests__   # 後端（需要有可用的 PostgreSQL；共用一庫，根 vitest.config.mts 已設 sequential，勿改平行）
npm run test --workspace=client   # 前端（client 內為 vitest run）
```

注意：`server/package.json` 目前沒有 `test` script，後端請用第一條指令；`npm run test --workspace=server` 會失敗。

### Lint 與型別

```
npm run lint --workspace=client   # eslint --max-warnings 0
npm run lint --workspace=server
npm run build --workspace=shared  # 改 shared/types.ts 後必跑
```

另注意：`server/` 為 ESM（`"type": "module"`），import 本地 TS 檔一律加 `.js` 後綴；DB 存取一律經 `query`／`withTransaction`。

## 部署與資料庫連線

- 部署時必須設定 `DATABASE_URL` 指向外部受管 PostgreSQL（如 Supabase、Railway 或自有 RDS）。
- 連線字串網域含 `supabase.co` 時系統會自動啟用 SSL（`rejectUnauthorized: false`）；也可用 `PGSSLMODE=require` 強制啟用。
- 資料保存在外部資料庫，服務 redeploy / restart / spin down 後資料依然存在，不再依賴本地 SQLite 檔案。
- 服務從 SQLite 遷移到 PostgreSQL 前，請先準備既有 `.db` 檔：

```
$env:SQLITE_PATH="./data/grocery.db"
$env:DATABASE_URL="postgresql://.../"
npx tsx server/scripts/migrate-sqlite-to-pg.ts --replace
```

使用 `--replace` 會先清空目標表再匯入（保留原始 id 並修正 id 序列）。遷移前建議先以舊版（或手動）下載一份資料備份作為逃生門。

## 部署到 Vercel

本專案是一個 npm workspaces monorepo：`client`（Vite SPA）、`server`（Express API）、`shared`（型別）。Vercel 以「單一專案」部署：前端靜態檔走 CDN，Express 掛在一個 Serverless Function。

### 為什麼不能「零設定」直接部署

- Vercel 只會用專案**根目錄**推斷框架，根目錄沒有 `index.html`/Vite 設定，自動偵測會失敗。
- Vercel **不執行 `express.static()`**，也不會自動找 `server/src/index.ts`，所以原本「後端同時託管 `client/dist`」的寫法在 Vercel 上不會生效。
- Express 需要一個被 Vercel 辨識的函式入口。

因此本專案已加入兩個檔案：

| 檔案 | 作用 |
|------|------|
| `vercel.json` | 關閉框架自動偵測（`framework: null`）、指定建置指令與靜態輸出目錄、把 `/api/*` 與 `/health` 導到函式、其餘路徑 SPA fallback 到 `index.html` |
| `api/index.mjs` | Vercel Function 入口，`export default` 匯出的 handler 直接呼叫 `server/dist/index.js` 的 Express app |

`vercel.json` 的關鍵設定：

```json
{
  "framework": null,
  "buildCommand": "npm run build --workspace=shared && npm run build --workspace=client && npm run build --workspace=server",
  "outputDirectory": "client/dist",
  "functions": { "api/index.mjs": { "includeFiles": "server/dist/**" } },
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index.mjs" },
    { "source": "/health", "destination": "/api/index.mjs" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 部署步驟

1. 在 Vercel **Import** 這個 Git repository。
2. **Root Directory 留空（= 專案根目錄）**，Framework Preset 選 **Other**。
3. 建置與輸出目錄會由 `vercel.json` 決定，不需在 UI 手動填。
4. 在 **Settings → Environment Variables** 設定：
   - `DATABASE_URL`：外部受管 PostgreSQL 連線字串（必填，例如 Supabase / Neon / Railway）。
   - `PGSSLMODE=require`：若資料庫要求 SSL（Neon、Vercel Postgres 等非 `supabase.*` 網域）**務必設定**，否則 `pg` 不會帶 SSL 而連線失敗。Supabase 網域則會自動判斷。
5. Deploy。完成後：`https://<你的網域>/health` 應回 `{"status":"ok"}`（資料庫沒連上時回 503，但服務仍會啟動，這是設計）。

### Serverless 注意事項

- **務必使用連線池（pooler）連線字串**：Serverless 會依流量開多個實例，每個實例各有一個 `pg.Pool`（`max: 10`），直連容易把資料庫連線數吃滿。Supabase 請用 Supavisor pooler（port `6543`），Neon 請用 `-pooler` 主機。
- `server/dist` 是 Vercel 建置時產生的（`git` 不追蹤），由 `buildCommand` 先編譯再打包進函式。
- `better-sqlite3` 只在一次性遷移腳本使用，不會進入 runtime bundle；`engines.node` 已釘 `22.x` 以取得穩定的 prebuilt binary。
- 本機可用 `npx vercel dev` 模擬（需先 `npm i -g vercel` 並 `vercel link`）。

### 替代方案：拆成兩個 Vercel 專案

若想讓前端與 API 各自獨立擴充（例如前端 CDN、API 獨立），可拆成兩個專案：`client` 一個（Framework = Vite）、`server` 一個（Framework = Express）。但因 `server` 依賴 workspace 的 `shared`，需讓 Vercel 從 repo 根目錄安裝，且要把 `client/src/services/api.ts` 的 `baseURL: '/api'` 改成讀取環境變數（例如 `import.meta.env.VITE_API_URL`）指向 API 網域。除非有明確需求，建議先用上面的單一專案部署。
