## 1. 後端：匯入服務

- [x] 1.1 新增 `server/src/services/databaseImportService.ts`，以 `Queryable` 介面撰寫（供測試替換），實作設計規範的輕量結構驗證（`exportedAt` 為字串、`products`/`orders`/`orderItems` 為陣列、各列關鍵欄位型別正確，不做逐欄精細比對），格式不符時擲出 400 `HttpError`；驗證：新增失敗注入/單元測試通過
- [x] 1.2 實作「完整取代」模式：`TRUNCATE products, orders, order_items RESTART IDENTITY CASCADE` 後依序插入 `products` → `orders` → `order_items`，且保留備份檔中的原始 id；驗證：replace 測試斷言資料與備份一致
- [x] 1.3 實作「合併」模式：依 `products` → `orders` → `order_items` 順序，以 `INSERT ... ON CONFLICT (id) DO UPDATE` 逐表 upsert，未涵蓋於備份的既有列予以保留；驗證：merge 測試斷言存在列更新、不存在列插入、未涵蓋列保留
- [x] 1.4 實作序列同步：匯入後以 `setval(pg_get_serial_sequence(...), GREATEST(COALESCE(MAX(id),0),1))` 推進三張表的 id 序列；驗證：replace 導入高 id 備份、merge 新增高 id 列後，後續新插入的列 id 皆不與備份列衝突
- [x] 1.5 以 `withTransaction` 包裹整段匯入，成功時單一 commit、任一步失敗即全部回滾；驗證：服務單元測試斷言成功路徑僅 commit 一次、失敗路徑觸發 ROLLBACK

## 2. 後端：路由與 body 上限

- [x] 2.1 於 `server/src/routes/database.ts` 新增 `POST /import`，接收 `{ mode, backup }`，成功回傳 200 並附匯入統計、驗證失敗回傳 400 `{ error }`、資料庫錯誤回傳 500 `{ error }`；驗證：新增 e2e 測試通過
- [x] 2.2 在 `server/src/index.ts` 將 `express.json()` 上限調升為 `10mb`（支援大型備份檔）；驗證：新增單筆 >100kb 的備份 e2e 測試通過、lint 通過

## 3. 後端測試

- [x] 3.1 新增 `server/__tests__/databaseImport.e2e.test.ts`：完整取代模式將既有資料替換為備份內容且順序一致；驗證：`npx vitest run server/__tests__`（需可用的 PostgreSQL）通過
- [x] 3.2 新增合併模式測試：id 存在則更新、不存在則插入、備份未涵蓋的資料保留、空資料表亦可插入；驗證：`npx vitest run server/__tests__` 通過
- [x] 3.3 新增格式驗證測試：缺少必要欄位、型別錯誤、非合法 JSON、`mode` 非 `replace`/`merge` 皆回傳 400 且不更動資料；驗證：`npx vitest run server/__tests__` 通過
- [x] 3.4 新增回滾測試：以真實 DB 觸發 FK 違反（order_item 參照不存在的 product）與 name/barcode 唯一性衝突，驗證交易內回滾後資料維持匯入前狀態；另依 `connectionError.test.ts` 模式（死連線 URL）或 stub `withTransaction` 驗證資料庫連線失敗亦整體失敗不回寫；驗證：`npx vitest run server/__tests__` 通過
- [x] 3.5 新增空備份測試：三陣列皆空時 replace 清空既有資料、merge 保留既有資料並回傳成功；驗證：`npx vitest run server/__tests__` 通過

## 4. 前端：匯入服務與對話框

- [x] 4.1 於 `client/src/services/databaseService.ts` 新增 `importDatabase(file, mode)`：讀取檔案文字並 `api.post('/database/import', { mode, backup })`；驗證：新增單元測試（mock api）通過
- [x] 4.2 新增 `client/src/components/ImportDialog/ImportDialog.tsx`（沿用 ExportConfirmationDialog 樣式）：`.json` 檔案輸入（`accept=".json,application/json"`）、「完整取代/合併」模式選項（預設完整取代）、確認/取消按鈕與處理中狀態；驗證：元件測試通過
- [x] 4.3 於 `client/src/components/Layout.tsx` 新增「📥 匯入資料庫」按鈕並接入 ImportDialog：成功顯示成功訊息並關閉視窗、失敗顯示錯誤訊息並保留視窗；驗證：Layout 相關測試通過

## 5. 前端測試

- [x] 5.1 新增 ImportDialog 元件測試：開啟視窗顯示檔案選擇與模式選項、取消不觸發呼叫、選擇非 .json 即時拒絕、未選檔即確認顯示錯誤、成功後關閉視窗、失敗後保留視窗；驗證：`npm run test:client` 通過
- [x] 5.2 更新 `Layout` 匯入/匯出整合測試（mock `importDatabase`），涵蓋開啟按鈕、確認與錯誤分支；驗證：`npm run test:client` 通過

## 6. 整體驗證

- [x] 6.1 手動以實際開檔流程驗證：匯出 → 更改資料 → 以「完整取代」匯入 → 資料逐項還原；驗證：`npx vitest run server/__tests__`（需 PostgreSQL）、`npm run test:client`、`npm run lint`（含 typecheck）全數通過