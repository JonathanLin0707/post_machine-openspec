## Context

現有 `database` 能力已提供匯出（`GET /api/database/export` 回傳包含 `exportedAt`、`products`、`orders`、`orderItems` 的 JSON，為整個資料庫的唯一完整備份格式）。資料庫僅有三張資料表（`products`、`orders`、`order_items`），且具外鍵關係：

- `order_items.order_id → orders.id`（ON DELETE CASCADE）
- `order_items.product_id → products.id`（ON DELETE RESTRICT）
- `products.name`、`products.barcode` 具唯一性約束

後端已提供 `withTransaction`（`server/src/database.ts:107`）可包裹單一交易。前端已有 `ExportConfirmationDialog` 確認視窗模式，以及 `Layout` 中的「💾 匯出資料庫」按鈕。動機與需求見 proposal.md 與 delta specs。

## Goals / Non-Goals

**Goals:**
- 提供與匯出對稱的匯入：`POST /api/database/import`，接受 JSON 備份並以單一交易套用至 PostgreSQL。
- 支援「完整取代」（truncate 後重建）與「合併」（依 id upsert）兩種模式，皆由前端視窗供使用者選擇。
- 匯入失敗整體回滾，資料庫維持匯入前狀態。
- 前端提供「匯入資料庫」按鈕、檔案選擇、模式選擇與確認視窗。

**Non-Goals:**
- 不做欄位層級的精細 schema 比對（例如缺少 `products.barcode` 不視為致命，交由資料庫約束把關）。
- 不提供 CSV 匯入或 SQLite 檔案匯入（SQLite 遷移已有獨立的一次性腳本 `migrate-sqlite-to-pg.ts`）。
- 不做匯入時的商品影像下載或檔案附件處理。

## Decisions

### 1. API 形式：JSON body 而非 multipart 上傳
`POST /api/database/import` 直接接收 JSON body：`{ mode: 'replace' | 'merge', backup: { exportedAt, products, orders, orderItems } }`。客戶端以 axios POST 送出檔案文字內容即可。
- **理由**：備份檔本身即 JSON，直接以 JSON body 傳輸最自然，不需引入 multer/檔案暫存，且與既有 `express.json()` middleware 一致。
- **替代方案**：multipart form-data（`multer`）。額外依賴且管理暫存檔，非必要。

### 2. body 大小上限調升
`express.json()` 預設上限 100kb，大量訂單的備份檔可能超過。在 `server/src/index.ts` 將全域 `express.json({ limit: '10mb' })`。
- **理由**：備份內容主要為訂單明細，10mb 已遠超過合理規模且不致影響其他 API。
- **風險**：limit 過大可能被濫用 → 見 Risks。

### 3. 匯入服務單一交易（含可替換的 Queryable）
新增 `server/src/services/databaseImportService.ts`，由 `withTransaction` 包裹。內部一律透過 `Queryable` 介面操作，使失敗注入測試可替換資料庫存取層。
- 流程：**驗證 → 依模式套用 → 同步序列 → commit**。
- 依賴順序插入：`products` → `orders` → `order_items`（order_items 依賴另兩張表）。
- 驗證失敗丟出可帶 status 的 `HttpError`（400），資料庫錯誤走既有 error middleware（500）；兩者皆在交易內，任一步失敗即 ROLLBACK。

### 4. replace 模式：TRUNCATE 後重建
在交易內 `TRUNCATE products, orders, order_items RESTART IDENTITY CASCADE`，再依備份內容逐列 `INSERT`（保留檔中原始 id）。
- **理由**：保留原始主鍵值，使備份還原時資料與匯出時完全一致。
- **替代方案**：不指定 id 由序列產生 → 會與備份內容不一致，失去還原意義。

### 5. merge 模式：ON CONFLICT (id) DO UPDATE
三張表皆以 `id` 為主鍵，`INSERT ... ON CONFLICT (id) DO UPDATE SET ...`。
- **理由**：單一往返即達成「存在更新、不存在插入」，且不影響檔案中未涵蓋的既有資料。
- **保留欄位**：UPDATE 僅覆蓋備份中提供的欄位；備份格式固定（由匯出產生），故不處理部分欄位差異。
- **外鍵一致性**：依賴順序插入後，若備份內參照不一致（如 order_item 指向不存在的 product），FK 違反即整體回滾。

### 6. 序列同步（sequence resync）
兩種模式匯入帶有明確 id 的列後，都需將三張表的 id 序列推進至 `max(id)`，否則下次新增會碰撞或跳號錯誤：
```sql
SELECT setval(pg_get_serial_sequence('products', 'id'), GREATEST(COALESCE(MAX(id), 0), 1))
```
- 空資料時設為 1，避免 `setval` 於空表失敗。

### 7. 前端：獨立 ImportDialog 元件
新增 `client/src/components/ImportDialog/ImportDialog.tsx`（沿用 `ExportConfirmationDialog` 的視覺樣式），內含 `.json` 檔案輸入（`accept=".json,application/json"`）、模式選項（替換/合併，「完整取代」為預設）、確認/取消按鈕與處理中狀態。
- `Layout` 新增「📥 匯入資料庫」按鈕開啟視窗。
- `client/src/services/databaseService.ts` 新增 `importDatabase(file, mode)`：讀取檔案文字 → `api.post('/database/import', { mode, backup })`。
- 成功 → 顯示成功訊息並關閉；失敗 → 顯示錯誤並保留視窗供重試。

## Risks / Trade-offs

- [全域 `express.json` limit 提高到 10mb，放寬了所有 JSON 路由的身材上限] → 僅接受 JSON、且各路由皆有狀態檢查；必要時可改為只對 import 路由掛載較大 limit。
- [replace 模式直接清空既有資料，誤觸恐造成資料遺失] → 匯入必須經確認視窗兩步驟（選檔＋確認），且僅在模式選單明示「完整取代」而非預設模糊選項。
- [merge 模式遇到唯一性衝突（如 name/barcode 與既有列重複）會整體回滾] → 回滾後回傳明確錯誤訊息，使用者可改選「完整取代」或先處理衝突。
- [備份檔格式僅做輕量驗證，型別不精確處交給資料庫約束] → 資料庫 PK/FK/唯一性約束作為最終防線，驗證層負責結構性錯誤與易讀的錯誤訊息。

## Migration Plan

1. 部署 `server`：新增 import 路由與服務（原有 `/api/database/export` 不變）。
2. 部署 `client`：新增「匯入資料庫」按鈕與 ImportDialog。
3. 可獨立上線；匯入為手動觸發，無背景任務。回滾：還原前端按鈕與後端路由即可，資料不受影響（匯入失敗一律回滾）。

## Open Questions

無。