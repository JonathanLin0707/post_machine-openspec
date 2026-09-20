# Tasks: add-export-confirmation-dialogs

## 1. Export confirmation dialog component

- [x] 1.1 Create `client/src/components/ExportConfirmationDialog/ExportConfirmationDialog.tsx` with props `title`, `message`, `confirmLabel`, `cancelLabel`, `onConfirm`, `onCancel`, `isProcessing`; overlay/Tailwind styling consistent with CheckoutConfirmationDialog; buttons disabled while `isProcessing`. Verify a new component test renders title/message and fires `onCancel`/`onConfirm` (from `client/`: `npx vitest run src/__tests__/ExportConfirmationDialog.test.tsx` passes)

## 2. Database export confirmation gate

- [x] 2.1 Update `client/src/components/Layout.tsx` `handleExportDatabase` so clicking「💾 匯出資料庫」opens the dialog, 「確認」runs the existing `exportDatabase()` then closes, 「取消」just closes without exporting. Verify a new Layout test (MemoryRouter wrapper) asserts cancel never calls the DB download and confirm does (from `client/`: `npx vitest run src/__tests__/LayoutDatabaseExport.test.tsx` passes)
- [x] 2.2 Ensure `handleExportDatabase` closes the dialog in a `finally` so errors still surface the existing 「資料庫匯出失敗」alert. Verify the Layout test covers the failure path (dialog closes, alert shown)

## 3. CSV export confirmation gate

- [x] 3.1 Update `client/src/pages/SalesReport.tsx` `exportCSV` so clicking「📥 匯出 CSV」opens the dialog, 「確認」runs the existing POST `/reports/csv-export` + download then closes, 「取消」closes without calling the API. Verify updated `SalesReportCSVExport.test.tsx` passes (from `client/`: `npx vitest run src/__tests__/SalesReportCSVExport.test.tsx`)
- [x] 3.2 Update the existing 4 scenarios in `SalesReportCSVExport.test.tsx` to click「確認」in the dialog before asserting download/alerts, and add scenarios: cancel aborts the download, and a successful export closes the dialog. Verify all scenarios pass (from `client/`: `npx vitest run src/__tests__/SalesReportCSVExport.test.tsx`)

## 4. Regression

- [x] 4.1 Run the full client suite from `client/` and the server suite from repo root; verify all tests pass and no backend behavior changed (`client: npx vitest run`; root: `npx vitest run server/__tests__`)