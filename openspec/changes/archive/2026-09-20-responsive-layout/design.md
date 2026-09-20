## Context

現況（見 proposal.md Why）：全站以桌面寬度設計。`Layout.tsx` 導覽列為 6 個按鈕的橫排 flex；`POS.tsx` 為 `flex h-screen` 左右雙欄（商品區 `w-2/3`＋購物車 `w-1/3`）；`SalesReport.tsx` 摘要卡為固定 `grid-cols-3`；`Orders.tsx` 表格已有 `overflow-x-auto`，`ProductManagement.tsx` 表格無橫滑容器。專案使用 Tailwind CSS 3.4（預設斷點 sm 640／md 768／lg 1024），`Layout.css` 僅以 `@apply` 定義 nav 樣式。`index.html` viewport 已存在。

## Goals / Non-Goals

**Goals:**

- 純前端變更達成 spec 全部需求，不動 API 與資料結構。
- 手機版資訊架構與桌面版對等（無功能被藏到找不到）。

**Non-Goals:**

- 不做 PWA／離線／原生 App 殼。
- 不重設計桌面版視覺；不修 `activeTab` 寫死的既有小毛病（順手修可以，但不列入驗收）。
- 不引入 CSS 框架替換 Tailwind。

## Decisions

### 1. 純 Tailwind 響應式前綴為主，`Layout.css` 只放漢堡動畫

- 手機優先寫法：預設類名即手機版面，`md:`／`lg:` 往上疊加桌面還原。理由：Tailwind 預設斷點恰好對應 spec（640／1024），零設定；`SalesReport` 已有 `lg:grid-cols-2` 前例，風格一致。
- 替代方案（自訂 CSS media query／`useMediaQuery` hook）否決：增加維護面，且絕大多數需求是排版切換、不需 JS 斷點邏輯。唯一需 JS 的是漢堡選單開合（React state，見決策 2）。

### 2. 漢堡選單用 React state 收合，斷點以下才渲染按鈕

- `Layout.tsx` 加 `isMenuOpen` state；漢堡按鈕 `md:hidden`，完整導覽列手機下 `hidden`、選單展開時以直排下拉顯示，`md:flex` 恢復橫排。選單項目沿用既有 `Link`，點擊後關閉選單（`onClick` 設 false）。
- 桌面與手機兩份導覽共用 `renderNavItems(variant)` helper（僅排版前綴與 `closeMenu` 不同）與 `openDialogAndClose()`，避免將來增刪導覽項時兩邊漂移。
- 替代方案（底部 tab bar）否決：用戶已選漢堡選單；且匯出／匯入按鈕不適合塞 tab bar。

### 3. POS 手機改單欄堆疊、購物車置底

- 外層 `flex h-screen` 手機改 `flex-col`（`md:flex-row` 還原）：商品區 `w-full`、購物車區 `w-full border-t`；商品網格手機 `grid-cols-2` 維持（商品卡小、兩欄好逛），平板以上沿用現有 `lg:`／`xl:` 欄數。
- 理由：收銀動線是「挑商品→看車→結帳」，上下堆疊最符合手機捲動習慣；側邊欄 overlay 方案會遮擋商品，不利連續加購。

### 4. 表格採「區域橫滑＋關鍵欄優先」

- `Orders` 既有 `overflow-x-auto` 保留；`ProductManagement` 表格補同樣容器。篩選列 `flex-wrap` 允許換行。不改欄位、不轉卡片式（卡片式改動大且報表頁已有卡片呈現）。
- `SalesReport` 摘要 `grid-cols-3` 改手機 `grid-cols-1`（`sm:grid-cols-3` 還原）；圖表區已有 `grid-cols-1 lg:grid-cols-2`，僅需確認小螢幕圖表高度。

### 5. Dialog 統一小螢幕全寬規則

- 各 Dialog 外層已有 `p-4`＋`max-w-*`＋`max-h-[80vh] overflow-y-auto` 雛形（以 `Orders` 明細框為準）：統一為手機 `max-w-full`、內容區可捲、按鈕列 sticky 置底，桌面維持置中卡片。

## Risks / Trade-offs

- [Risk] 真機字級／觸控手感與 DevTools 模擬有落差 → Mitigation：驗收以 Chrome DevTools 裝置模式（360×740、768×1024、820×1180）截圖為準，並在 tasks 明列每頁截圖檢查點。
- [Risk] POS 單欄後購物車被推到很下方，結帳多一次捲動 → Mitigation：購物車摘要列（件數／總額＋「去結帳」錨點）在手機置頂或 sticky，接受一次捲動換取不遮擋商品。
- [Risk] `grid-cols-2` 商品卡在 320px 舊機上過擠 → Mitigation：本次不斷點 320px（spec 下限 360px），超小螢幕允許降級顯示。
- [Trade-off] 表格橫滑 vs 卡片化：選橫滑是為了最小改動；若驗收覺得難用，另開 change 做卡片化，不在本 change 擴 scope。

## Migration Plan

- 純前端靜態變更，隨 `client/dist` 部署即生效，無資料遷移。可獨立回滾（revert 即回桌面版）。
- 建議合併前在上述三種寬度截圖對照桌面版做視覺回歸。

## Open Questions

- 無（斷點、選單形式、範圍皆已在提案階段確認）。
