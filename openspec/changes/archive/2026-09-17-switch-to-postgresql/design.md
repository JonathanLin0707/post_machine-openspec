# switch-to-postgresql — Design

## Context

See proposal.md — Why.

Current data layer（`server/src/database.ts` + routes/services）以 better-sqlite3 同步 API 直接存取 SQLite 檔，全部經過 `db.prepare(...).get/.all/.run`。部署於 Render free tier（ephemeral filesystem），SQLite 檔在 deploy/restart/spin-down 後被重置 → 需要把持久化移到外部 PostgreSQL（目標 Supabase）。既有 API 回應形狀與前端行為必須保持不變；`/api/database/export` 的行為例外（見 spec「資料庫備份匯出」）。

約束：Express 4（handler 目前皆同步、外包 try/catch）、無 ORM、測試用 supertest + 臨時 db（`DATABASE_PATH`）。

## Goals / Non-Goals

**Goals:**
- 以 `pg`（node-postgres）取代 better-sqlite3，`database.ts` 仍是唯一資料存取表面，route 不需知道 pg 細節。
- 回應形狀（含 numeric 型別）與前端行為保持不變。
- orders 建立流程改為原子交易（現況多語句分開 commit 並非原子，順手修正）。
- 提供一次性遷移腳本，將既有 SQLite 資料搬入 PostgreSQL。
- 測試改造為使用 PostgreSQL 測試資料庫。

**Non-Goals:**
- 不導入 ORM（Prisma/Drizzle/Knex）。
- 不使用 Supabase 的 auth/storage/realtime 功能，只當 managed PostgreSQL 用。
- 不做多實例水平擴充、讀寫分離或複本。
- 不處理本機已從 git 移除 `.db` 檔的收尾（屬另一項部署衛生，非本變更程式碼）。
- 不實作「匯入/還原」API（spec 只有匯出備份）。

## Decisions

### D1. 連線層：`pg` Pool，從 `DATABASE_URL` 讀取
- 新增 `server/src/db/pool.ts`：匯出 singleton `Pool`，設定取自 `process.env.DATABASE_URL`。
- Supabase 需要 SSL：當 host 含 `supabase.co`（或 `PGSSLMODE=require` 被設定）時啟用 `ssl: { rejectUnauthorized: false }`。
- 替代方案：`postgres`（porsager）、Knex、Prisma — pg 是最貼近「直接寫 SQL」現狀的非同步 minimal driver；ORM 對本專案規模過重。

### D2. `database.ts` 重寫為非同步表面
- `initDatabase(): Promise<void>` — 連線 + 冪等 DDL（`CREATE TABLE IF NOT EXISTS`），連不上時 reject，由 `index.ts` 記錄錯誤並讓 `/health` 反映。
- 提供 `query<T>(text, params): Promise<QueryResultLike<T>>`（含 `.rows`）輔助、移除同步 `getDb()`（內部破壞性，對外 API 不變）。
- 移除 `dbPath`/`DATABASE_PATH` 與 `PRAGMA`/`fs.mkdirSync`；刪除無作用的 `saveDatabase()`。
- Schema 對映（行為維持現狀）：
  - `INTEGER PRIMARY KEY AUTOINCREMENT` → `SERIAL PRIMARY KEY`
  - `DATETIME DEFAULT CURRENT_TIMESTAMP` → `TIMESTAMPTZ DEFAULT now()`
  - `REAL`/`INTEGER/TEXT/UNIQUE/NOT NULL` 僅做出型別對映（`DOUBLE PRECISION`、`INTEGER`、`TEXT`、`UNIQUE` 保留）
  - 金錢欄位沿用 `DOUBLE PRECISION`（等同 SQLite REAL，讓 pg 回傳 number，與現況相同）；`NUMERIC` 會回傳字串需逐處 `Number()`，放進 Trade-off。

### D3. Route / Service 全量非同步化 + SQL 方言對映
- `?` 佔位符 → `$1..$n`；`.get()/.all()/.run()` → `await query(...)`（`.rows`）；`lastInsertRowid` → `INSERT ... RETURNING id`。
- `orders.ts` POST：改用 `pool.connect()` 取出 client，`BEGIN` → 逐商品驗庫存/扣庫存 → 建單（RETURNING id）→ 建明細 → `COMMIT`；任一步失敗 `ROLLBACK` 並回 500。此變更使建立訂單具原子性。
- 聚合 JSON 語法：`json_group_array(json_object(...))` → `COALESCE(json_agg(json_build_object(...)) FILTER (WHERE oi.order_id IS NOT NULL), '[]'::json)`，維持無明細時 `items_json: []`。
- `csvExportService.ts`：`GROUP_CONCAT(x, ', ')` → `string_agg(x, ', ')`；`fetchAllOrders` 改透過 `query` 非同步；建構子不再持有 db。
- `reports.ts`：`DATE(created_at) = ?` → `created_at::date = $1`；月份聚合的 `strftime` → `to_char` 對應語法。
- 回應 numeric 皆再過一層 `Number()`（既有 code 已大多如此），確保 shape 不變。

### D4. `/api/database/export` → JSON 備份
- 讀取 products / orders / order_items（含明細），回傳 `application/json`、`Content-Disposition: attachment`，檔名 `grocery_backup_<ISO>.json`，內容 `{ exportedAt, products, orders, orderItems }`。
- 失敗時 500 + 錯誤訊息，不產出缺漏檔（對應 spec scenario）。前端「匯出資料庫」按鈕與確認視窗流程完全不變。
- 替代方案考慮：`pg_dump`（備份的是 Postgres dump，非應用資料、後端才懂）、移除按鈕（與使用者「需要備份」的意圖衝突）→ 採 JSON 快照。

### D5. 一次性遷移腳本 `server/scripts/migrate-sqlite-to-pg.ts`
- 以 better-sqlite3 讀取來源（`SQLITE_PATH`，預設 `./data/grocery.db`，可指定），連目標池（`DATABASE_URL`）。
- 依序 products → orders → order_items，**顯式插入 id**（SERIAL 允許顯式值）以保留外鍵關係與時間戳。
- 冪等：預設目標表清空後再插入；加 `--replace` 旗標保護，避免誤清。
- 輸出各表遷移筆數，遷移後用 count 比對來源/目標。
- better-sqlite3 改列 devDependency，僅供此腳本使用；待確認遷移長期不再需要後移除（見 Open Questions）。

### D6. 組態與本地開發
- `server/.env.example`：`DATABASE_PATH` → `DATABASE_URL`。
- 本地開發/測試連本機 Docker Postgres：`docker run --name grocery-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16`；`DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres`。
- README 補「部署/連線」小節（Supabase 建置 + DATABASE_URL 設定）。

### D7. 測試改造
- 移除 `server/__tests__` 中對 `DATABASE_PATH` 的依賴。
- 新增 `server/__tests__/helpers.ts`：在 import app 前設定 `DATABASE_URL`（測試庫），並提供 `resetDb()`（`TRUNCATE ... RESTART IDENTITY CASCADE`）於各測試 file 的 `beforeEach`，維持現有 supertest e2e 風格。
- 優雅降載：若 `DATABASE_URL` 未設定則該檔案 `describe.skip`，本機無 Postgres 時測試可跑（但有 Postgres 才完整）。
- 既有 csvExport / orders / products 測試逐步換成朝 PG 跑，斷言不變。

## Risks / Trade-offs

- [金錢精確度] `DOUBLE PRECISION` 與 SQLite REAL 同樣非十進位精確 → 沿用現況，需真正十進位時再換 `NUMERIC` 並全處 `Number()`（低成本遷移，見 Open Questions）。可用的既有偵測：回應欄位都以 `Number()` 正規化。
- [全量非同步改寫觸及所有 route] → 機械式 1:1 對映、維持回應 shape；靠既有測試套件 + 新增交易/匯出測試驗證。
- [交易化改變行為] 舊流程可能部分寫入成功；新流程全部 rollback → 屬改善，測試相應更新。
- [遷移正確性] 外鍵順序、欄位對齊錯誤 → 顯式 id 插入、`--replace` 旗標、筆數比對；遷移前先用舊版 export 下載一份 JSON 備份作為逃生門。
- [本地/測試需要 Postgres] 開發工作流改變 → Docker 指令寫進 README，測試缺連線時 skip。
- [Supabase 免費 tier 7 天無活動會暫停] → POS 有真實流量即無慮；README 提醒。
- [pg numeric 回傳字串] → 以 `DOUBLE PRECISION` 規避；非現況風險但列入防呆。

## Migration Plan

1. **Supabase**：建 project（選靠近使用者的 region），開啟允許外部連線，取得 `DATABASE_URL`。
2. **本地驗證**：Docker Postgres 跑全套測試綠燈後，用 `DATABASE_URL` 指向本機的池跑遷移腳本，比對筆數。
3. **上線前備份**：以最新版（含新 export）下載 JSON 備份；舊訂單此刻仍在 SQLite。
4. **部署**：合併本變更 → Render 新增 `DATABASE_URL` env → 重新部署；啟動後 schema 自動建立、app 全用 PostgreSQL。
5. **遷移歷史資料**：對正式 Supabase 跑 `migrate-sqlite-to-pg.ts`（來源為最後一份 SQLite 快照），比對筆數 → 完成。
6. **驗證**：`/api/orders`、`/api/products`、`/api/reports/*` 回應正常；匯出 JSON 備份可下載。
7. **Rollback**：若 PG 不穩定，取消 `DATABASE_URL` 並 redeploy 前一版（SQLite 路徑回檔；上次 deploy 後的資料需靠備份手動恢復 — 本變更後即不再有此情境）。

## Open Questions

- 金錢欄位是否改用 `NUMERIC(12,2)`（需逐欄 `Number()` 正規化）→ 可後續再定，不影響本變更架構或任務拆分。
- better-sqlite3 依賴何時移除（遷移腳本長期需用？）→ 可在遷移完成後的小任務移除。
- Supabase project region / 專案名稱 → 使用者操作決定，非程式決策。