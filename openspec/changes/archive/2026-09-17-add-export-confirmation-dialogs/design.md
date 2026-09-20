# Design: add-export-confirmation-dialogs

## Context

- 動機見 `proposal.md - Why`。目前 `Layout.tsx` 的 `handleExportDatabase` 直接呼叫 `exportDatabase()`、`SalesReport.tsx` 的 `exportCSV` 直接 POST `/reports/csv-export` 並下載，點擊即觸發。
- 既有 modal 慣例：`CheckoutConfirmationDialog`（結帳確認）以半透明遮罩 + 白底卡片 + 標題 + 取消/確認按鈕呈現，處理中會禁用按鈕；樣式使用 Tailwind utilities。本變更沿用此模式。
- 規格（`specs/export-confirmation-dialog/spec.md`）要求：兩個匯出動作在執行前都需先顯示確認視窗；確認才執行、取消則不執行。

## Goals / Non-Goals

**Goals:**
- 以單一可復用的確認對話框元件，在資料庫匯出與 CSV 匯出前加入確認閘道。
- 取消時絕不觸發 API 呼叫或下載；確認時沿用現有匯出邏輯。
- 視覺與互動與結帳確認彈窗一致。

**Non-Goals:**
- 不改動後端、API 或匯出內容（含 CSV 檔頭、檔名、欄位）。
- 不重構 `CheckoutConfirmationDialog`、不引入對話框框架/函式庫。
- 不加入跨螢幕共享狀態機制。

## Decisions

- **D1: 新增共用 `ExportConfirmationDialog` 元件**。Props：`title`、`message`、`confirmLabel`、`cancelLabel`、`onConfirm`、`onCancel`、`isProcessing`。兩個匯出動作需要相同閘道，共用元件避免重複。替代方案：各寫一個專用彈窗 → 重複程式碼；把 `CheckoutConfirmationDialog` 泛化成通用 Modal → 放大影響面，排除。
- **D2: 不用原生 `window.confirm()`**。理由：無法套用既有樣式、阻塞主執行緒、與應用程式 UX 不一致，且難自動化測試。自訂 modal 已是 codebase 慣例。
- **D3: 各頁面以 `useState` 存放彈窗開關**（`Layout.tsx` 與 `SalesReport.tsx` 各自一個 local boolean）。兩者頁面無關聯，local state 最小化影響面。替代方案：共用 store/context → 過度設計，排除。
- **D4: 閘道位置**——按鈕 `onClick` 改為開啟彈窗；彈窗「確認」執行既有 async handler 並在完成後關閉、「取消」僅關閉。既有 `exportDatabase()` / `exportCSV()` 邏輯不變，只被延後到確認後呼叫。
- **D5: 樣式複用**——沿用 `CheckoutConfirmationDialog` 的 Tailwind 類別（`fixed inset-0 bg-black/50 z-50` 遮罩、白底圓角卡片、成功/取消兩顆按鈕），確保視覺一致。替代方案：全新樣式 → 不一致，排除。
- **D6: 處理中禁用按鈕**——確認後執行匯出期間，`isProcessing` 為 true 並禁用「確認」/「取消」，防止重複點擊造成重複下載，沿用結帳彈窗行為。

## Risks / Trade-offs

- [確認後 handler 拋錯時彈窗未關閉] → `onConfirm` 以 try/finally 包覆，無論成敗皆關閉彈窗；既有錯誤 alert 邏輯維持不變。
- [快速連點造成重複下載] → 處理期間禁用按鈕（D6）。
- [缺少自動化覆蓋] → 為對話框元件加入 client 測試：取消不呼叫匯出、確認會呼叫匯出。

## Migration Plan

純前端變更，隨 client 一起部署；無資料遷移；rollback 為還原 commit。

## Open Questions

無。