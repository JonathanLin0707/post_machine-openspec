<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->

# AGENTS.md — AI coding 最小規則

## Structure
- client/ - 前端
- server/ - 後端
- shared/ - 共用程式碼

## 指令（根目錄，npm workspaces）
- `npm install` / `npm run dev` / `npm run build --workspaces`
- `npm run lint --workspace=client|server`（`--max-warnings 0`，零警告才算過）
- 後端測試：`npx vitest run server/__tests__`（需 live PostgreSQL，見下）
- 前端測試：在 `client/` 下跑 `npx vitest run`

## 型別單一來源
- `shared/types.ts` 是唯一型別來源；改完跑 `npm run build --workspace=shared`。
- 前後端只准 import `shared`，不准各寫一份 Product / Order / Report 型別。

## ESM 坑
- `server/` 是 `"type": "module"`：import 本地 TS 檔一律加 `.js` 後綴（如 `../database.js`）。

## 資料庫（PostgreSQL only）
- 連線只讀 `DATABASE_URL`（`server/.env`，不進版控）；`server/src/db/pool.ts` 是唯一建 pool 處，
  SSL 自動判斷（supabase 網域或 `PGSSLMODE=require`），不要另起連線或改 SSL 邏輯。
- 存取一律用 `server/src/database.ts` 的 `query` / `withTransaction`；Schema 變更只加到
  `SCHEMA_STATEMENTS`（`IF NOT EXISTS`，舊庫靠 `ADD COLUMN IF NOT EXISTS` 補欄位）。
- `initDatabase` 失敗時 server 保持啟動、`GET /health` 回 503——這是設計，不要改成啟動即 crash。
- 測試共用同一個 PG：沿用 `server/__tests__/helpers.ts`（`probeDatabase` 無庫 skip、
  `TRUNCATE ... RESTART IDENTITY CASCADE` 重置）；根目錄 `vitest.config.mts` 已設
  `fileParallelism: false`，不要改回平行。

## 訂單不變量（改 `routes/orders.ts` 前必看 `openspec/specs/order-discount/spec.md`）
- 建單必須走 `withTransaction`：驗庫存 → 扣庫存 → 算 subtotal → 驗 discount → 寫單，
  任一步失敗整單 rollback。
- `0 <= discount <= subtotal`，否則 400 且不建單；`total = subtotal - discount` 存庫。
- 報表（daily/monthly/top-products）一律讀已存 `total`，不重算。

## 規格優先
- 改行為前先讀 `openspec/specs/<scope>/spec.md`（共 10 個 scope）；spec 與程式衝突時以 spec 為準，
  並同步更新 spec。

**Important**
- 如果不確定架構，先閱讀 architecture.md。