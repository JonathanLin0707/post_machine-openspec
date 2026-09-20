## 1. 依賴與組態

- [x] 1.1 新增 `pg`、`@types/pg` 依賴，`better-sqlite3` 移列 devDependencies（供遷移腳本用）；驗證 `npm install` 成功、`server/package.json` 內容正確
- [x] 1.2 更新 `server/.env.example`：以 `DATABASE_URL` 取代 `DATABASE_PATH`；驗證檔案內容正確
- [x] 1.3 新增 `server/src/db/pool.ts`：從 `DATABASE_URL` 建 Pool，Supabase host 自動啟用 SSL；驗證模組可 import 且連線設定分派正確

## 2. 資料層核心（database.ts）

- [x] 2.1 重寫 `server/src/database.ts`：非同步 `initDatabase(): Promise<void>`、`query<T>()` 輔助、PostgreSQL DDL（SERIAL、TIMESTAMPTZ、UNIQUE、索引）；驗證連上本地 Docker Postgres 後建立 products/orders/order_items 與 4 個索引
- [x] 2.2 移除 `dbPath`/`DATABASE_PATH`、`PRAGMA`、`fs` 操作、同步 `getDb()` 與無作用的 `saveDatabase()`；`server/src/index.ts` 改 `await initDatabase()`；驗證 `tsc` build 通過、`/health` 正常回應

## 3. Routes / Service 非同步化

- [x] 3.1 `orders.ts`：`?`→`$n`、`.get/.all/.run`→`query()`、`lastInsertRowid`→`INSERT ... RETURNING id`；POST 包成 `BEGIN`/`COMMIT`/`ROLLBACK` 交易；`json_group_array`→`json_agg`（維持無明細時 `[]`）；驗證訂單新增/查詢測試通過，交易失敗無部分寫入
- [x] 3.2 `products.ts` 全量非同步化 + `$n`；驗證 products CRUD（含唯一性、刪除）測試通過
- [x] 3.3 `reports.ts`：`DATE()`→`::date`、`strftime`→`to_char`、`$n` 化；驗證 daily/monthly/top-products 測試通過且回應 shape 不變
- [x] 3.4 `csvExportService.ts`：`GROUP_CONCAT`→`string_agg`、`fetchAllOrders` 改非同步、移除持有 db 的建構子；驗證 csvExportService / e2e 測試通過且 CSV 內容不變
- [x] 3.5 `seedData.ts` 非同步化並寫入 PG；驗證 seed 執行成功且資料可查

## 4. 資料庫備份匯出

- [x] 4.1 `/api/database/export` 改回傳 JSON 備份（`{ exportedAt, products, orders, orderItems }`，Content-Disposition 下載）；驗證可下載且三表資料完整
- [x] 4.2 補該路由成功/失敗測試（失敗回 500 且不產出缺漏檔）；驗證新增測試通過

## 5. 遷移腳本

- [x] 5.1 新增 `server/scripts/migrate-sqlite-to-pg.ts`（讀 `SQLITE_PATH` 預設 `./data/grocery.db`，依序 products→orders→order_items 顯式 id 插入、`--replace` 旗標、輸出各表筆數）；驗證以一份 SQLite 快照遷到測試 PG 後來源/目標各表筆數一致

## 6. 測試改造

- [x] 6.1 新增 `server/__tests__/helpers.ts`：import 前設定 `DATABASE_URL`、提供 `resetDb()`（`TRUNCATE ... RESTART IDENTITY CASCADE`）；驗證無 `DATABASE_URL` 時測試 skip 不失敗
- [x] 6.2 將 `server/__tests__` 中依賴 `DATABASE_PATH`/臨時 SQLite 的測試全數改連測試 PG；驗證本地 Docker Postgres 下全套 server 測試通過
- [x] 6.3 前端與此變更相關的既有測試（含匯出確認對話框流程）仍全數通過；驗證 client `npx vitest run` 30/30
- [x] 6.4 新增「連接錯誤處理」測試：以不可達的 `DATABASE_URL`（例如 `localhost:1`）呼叫 `initDatabase()`，驗證其 reject、錯誤被記錄、服務不回 200；此測試不需真實 Postgres 即可執行
- [x] 6.5 新增執行期「不依賴本地資料檔」斷言：在測試 PG 環境發送 API 請求後，確認 working directory 未建立或寫入 `./data/grocery.db`；驗證測試通過

## 7. 文件與收尾

- [x] 7.1 README 補「部署 / 資料庫連線」段落（Supabase 建置、`DATABASE_URL`、本地 Docker Postgres 指令）；驗證文件段落存在且指令可執行
- [x] 7.2 執行期清除檢查：`server/src` 內無殘留 `DATABASE_PATH`、`getDb()`、better-sqlite3（遷移腳本除外）；驗證 `rg` 符合預期
- [x] 7.3 整合驗證：`npm run build` 成功、`npm run lint` 通過、server 全套測試（Docker PG）與 client 30/30 全綠