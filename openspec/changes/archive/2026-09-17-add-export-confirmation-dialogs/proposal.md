# Proposal: add-export-confirmation-dialogs

## Why

目前的「匯出資料庫」與「匯出 CSV」按鈕在點擊後會立即觸發下載（`Layout.tsx` 的 `handleExportDatabase`、`SalesReport.tsx` 的 `exportCSV`），使用者可能因誤點而觸發不必要的資料匯出。匯出屬於較重且不可逆的動作，應在執行前顯示確認視窗，避免誤觸。

## What Changes

- 在 `Layout.tsx` 點擊「💾 匯出資料庫」後，先顯示確認視窗；點擊「確認」才執行 `exportDatabase()`，點擊「取消」則關閉視窗且不執行匯出。
- 在 `SalesReport.tsx` 點擊「📥 匯出 CSV」後，先顯示確認視窗；點擊「確認」才呼叫 `/reports/csv-export` 並下載，點擊「取消」則關閉視窗且不執行匯出。
- 沿用現有 `CheckoutConfirmationDialog` 的彈窗模式（半透明遮罩、標題、取消/確認按鈕），新增可復用的匯出確認對話框元件。
- 不改動後端 API 或匯出內容，僅在前端加入確認閘道。

## Capabilities

### New Capabilities
- `export-confirmation-dialog`: 在執行資料庫匯出與 CSV 匯出之前顯示確認視窗，並依使用者選擇確認或取消決定是否執行匯出。

### Modified Capabilities
<!-- 無。匯出內容與 API 合約不變；新增的確認行為由新的 `export-confirmation-dialog` capability 描述。 -->

## Impact

- `client/src/components/Layout.tsx`: `handleExportDatabase` 改為先顯示確認視窗。
- `client/src/pages/SalesReport.tsx`: `exportCSV` 改為先顯示確認視窗。
- 新增 `client/src/components/ExportConfirmationDialog/`（或同等的確認對話框元件），參考既有 `CheckoutConfirmationDialog` 的樣式與互動。
- 後端與 API（`/database/export`、`/reports/csv-export`）不受影響。