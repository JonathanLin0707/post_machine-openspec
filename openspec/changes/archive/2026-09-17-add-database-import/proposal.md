## Why

目前系統提供資料庫匯出（JSON 備份檔），但缺少對應的匯入功能。當使用者需要還原備份、將資料從其他機器遷移，或在測試環境重建資料時，沒有辦法把 JSON 備份檔的內容更新回 PostgreSQL，導致備份僅能「匯出」而無法「復原」。

## What Changes

- 在 Layout 新增「匯入資料庫」按鈕，點擊後開啟匯入視窗。
- 匯入視窗讓使用者自行選擇 `.json` 備份檔，並選擇匯入模式：**完整取代**（清空三張資料表後依 JSON 內容重建，等同還原備份）或**合併**（以主鍵 id 比對，存在則更新、不存在則插入）。
- 新增後端 API `POST /api/database/import`，接收 JSON 備份內容，驗證格式與資料完整性後，於單一交易（transaction）內更新 PostgreSQL。
- 匯入前先顯示確認視窗；使用者明確確認後才執行匯入，避免誤觸造成資料覆寫。
- 匯入失敗（格式錯誤、欄位缺失、外鍵不一致等）時整體失敗並回傳錯誤訊息，不留下部分更新。

## Capabilities

### New Capabilities
- `database-import-dialog`: 匯入資料庫的 UI 流程，包含匯入按鈕、JSON 檔案選擇、匯入模式選擇與確認視窗。

### Modified Capabilities
- `database`: 新增資料庫匯入能力，包含 JSON 備份檔驗證、完整取代與合併兩種匯入模式、交易的整體性以及失敗時的錯誤處理。

## Impact

- `server/src/routes/database.ts`：新增 `POST /api/database/import` 路由。
- `server/src/services/`：新增資料庫匯入服務（JSON 驗證、取代/合併邏輯）。
- `client/src/services/databaseService.ts`：新增 `importDatabase` 函式。
- `client/src/components/Layout.tsx`：新增「匯入資料庫」按鈕。
- `client/src/components/`：新增匯入視窗元件（檔案選擇、模式選擇、確認）。
- `server/__tests__/` 與 `client/src/__tests__/`：新增對應測試。