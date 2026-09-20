## Why

目前所有頁面皆以桌面寬度設計，在手機（~360px）與平板（~768px）上會出現橫向捲動、表格擠壓、導覽列按鈕溢出等問題，店員無法用手機／平板進行收銀與查報表。隨著店內開始使用平板結帳，響應式適配已是必要需求。

## What Changes

- `Layout` 導覽列在手機寬度收合成漢堡選單（點開顯示全部導覽＋匯出／匯入），平板維持頂欄、桌面維持現狀。
- 全部 4 個頁面（POS、商品管理、訂單查詢、銷售報表）在手機／平板寬度下無橫向捲動主體（資料表格允許區域內橫滑），字級與觸控目標符合行動裝置可用性。
- POS 收銀在手機改為單欄堆疊（商品列表與購物車上下排列），平板維持雙欄但收窄購物車欄。
- 結帳確認、匯出確認、匯入、訂單明細等 Dialog 在小螢幕下全寬顯示且可捲動。
- 新增 Tailwind 斷點策略（`index.html` 的 viewport 已存在，不需動）；桌面版視覺與行為零變更。

## Capabilities

### New Capabilities

- `responsive-layout`：定義各斷點下導覽、頁面排版、表格、Dialog 的行為需求。

### Modified Capabilities

（無 — 現有 capability 的 REQUIREMENTS 皆為功能行為，不涉及版面；本次不改變任何功能行為。）

## Impact

- 僅影響 `client/`：`src/components/Layout.tsx`（含 `Layout.css`）、4 個 page 元件、Dialog 元件、`index.html`（viewport）、`index.css`（斷點基礎樣式）。
- 後端（`server/`）、共用型別（`shared/`）、所有 API 契約零變更。
- 需以真實手機／平板寬度（DevTools 裝置模擬）做視覺驗收；現有 Vitest 單元測試不受影響。
