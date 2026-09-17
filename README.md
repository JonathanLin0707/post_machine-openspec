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
| `src/database.ts` | PostgreSQL 連線管理與 Schema 初始化，提供 `query` / `withTransaction` 存取介面 |
| `src/db/pool.ts` | PostgreSQL 連接池（`pg.Pool`），透過 `DATABASE_URL` 取得連線資訊 |
| `src/services/` | CSV 匯出服務，用於生成銷售報告的 CSV 檔案 |
| `scripts/migrate-sqlite-to-pg.ts` | 一次性遷移腳本：將既有 SQLite 資料匯入 PostgreSQL |

### 共用型別 (`shared`)

| 目錄 | 說明 |
|------|------|
| `types.ts` / `dist/types.d.ts` | 訂單、產品、購物車項目、每日/每月報表等共用 TypeScript 型別定義 |

## 主要功能

- **收銀介面**：掃描條碼或搜尋商品，加入購物車，選擇付款方式（現金、信用卡、行動支付）
- **銷售報表**：查看每日與每月的銷售數據統計
- **CSV 匯出**：將銷售報告導出為 CSV 檔案
- **資料庫管理**：使用 PostgreSQL 儲存產品、訂單等資料；提供 JSON 備份匯出（`GET /api/database/export`）

## 技術棧

- **前端**：React + TypeScript
- **後端**：Node.js + Express + PostgreSQL（`pg` 連接池）
- **共用型別**：TypeScript

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
npm run dev --workspace=server
```

`/health` 回傳 `200 { status: 'ok' }`；資料庫未就緒時回傳 `503 { status: 'unavailable' }`。

### 測試

```
npx vitest run server/__tests__   # 後端（需要有可用的 PostgreSQL）
npx vitest run                    # 前端（在 client/ 下）
```

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

請將 `shared/types.ts` 加入聊天中，以便我可以直接編輯它。如果你需要修改其他檔案，也請先將其加入到聊天中。