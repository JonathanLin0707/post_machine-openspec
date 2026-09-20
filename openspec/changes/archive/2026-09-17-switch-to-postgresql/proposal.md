# switch-to-postgresql

## Why

Render free tier 使用 ephemeral filesystem：SQLite 資料檔在每次 redeploy、restart 或 spin-down（閒置 15 分鐘）後都會被整個重置，導致訂單資料反覆遺失。需要把持久化移出本機檔案系統，改用託管的外部資料庫。

## What Changes

- 資料層從 SQLite（better-sqlite3，同步 API）改為 PostgreSQL（`pg`，非同步連接池），連線由環境變數 `DATABASE_URL` 提供（目標：Supabase 免費 tier）。
- 所有同步的 `db.prepare(...).get/.all/.run` 改為非同步 `pool.query(...)`（`?` 參數改 `$1`）。
- orders 建立流程改為明確交易（`BEGIN` / `COMMIT` / `ROLLBACK`），整筆訂單原子寫入。
- Schema 改用 PostgreSQL 語法：`SERIAL`、`TIMESTAMPTZ`、`json_agg/json_build_object`、`string_agg`、`::date`。
- 新增一次性資料遷移腳本，把既有 SQLite 的 products / orders / order_items 遷入 PostgreSQL。
- **BREAKING**：`DATABASE_PATH` 環境變數由 `DATABASE_URL` 取代。
- **BREAKING**：`GET /api/database/export` 不再下載 SQLite `.db` 檔，改為下載完整資料 JSON 備份（products / orders / order_items）；前端「匯出資料庫」按鈕 UI 不變。
- 測試改連 PostgreSQL 測試資料庫，淘汰依賴 `DATABASE_PATH` 產生臨時 SQLite 檔的機制。

## Capabilities

### New Capabilities

（無。本變更異動既有 `database` capability，不另立新能力。）

### Modified Capabilities

- `database`: 修改「連接管理」requirement（SQLite 檔案連接 → PostgreSQL 連接池，via `DATABASE_URL`）；新增 requirements：外部持久化（資料可跨 deploy / restart / spin-down 存活）、一次性資料遷移（SQLite → PostgreSQL）、JSON 備份匯出（取代 `.db` 下載）。

## Impact

- `server/src/database.ts`：重寫為 PostgreSQL 連接池 + 非同步 schema 初始化。
- `server/src/routes/orders.ts`、`products.ts`、`reports.ts`：route handler 改非同步，SQL 改 PG 語法；orders 建立加交易。
- `server/src/routes/database.ts`：`/api/database/export` 改產出 JSON 備份。
- `server/src/services/csvExportService.ts`：`GROUP_CONCAT` → `string_agg`，非同步查詢。
- `server/src/seedData.ts`：非同步化。
- 新增 `server/scripts/migrate-sqlite-to-pg.ts`（一次性遷移腳本）。
- 依賴：`server/package.json` 新增 `pg`、`@types/pg`；資料遷移完成後移除 `better-sqlite3`。
- `server/.env.example`、`.gitignore`（移除 `data/grocery.db*` 相關假設）：以 `DATABASE_URL` 取代 `DATABASE_PATH`。
- 部署：Render 環境變數設定 `DATABASE_URL` 指向 Supabase。
- 測試：`server/__tests__/*` 改用 PostgreSQL 測試資料庫。
- 前端不受行為影響：`export-confirmation-dialog`、`reports/csv-export`、`sales-reporting` 等 capability 規格不變。