## 1. 導覽列漢堡選單

- [x] 1.1 在 `Layout.tsx` 新增漢堡按鈕與 `isMenuOpen` state，手機下隱藏橫排導覽、展開顯示直排選單（含 4 導覽＋匯出／匯入），點選後關閉選單並導向，以 DevTools 360px 驗證開合與導向正常
- [x] 1.2 768px 下確認頂欄橫排完整顯示全部項目、無溢出且無漢堡按鈕；1280px 下確認與變更前一致，以 DevTools 兩種寬度截圖驗證

## 2. POS 收銀頁

- [x] 2.1 外層改手機 `flex-col`／`md:flex-row`，商品區與購物車區手機全寬上下堆疊，並加購物車摘要 sticky 錨點，以 DevTools 360px 從加購到結帳走完一次不斷頁橫滑驗證
- [x] 2.2 確認平板與桌面維持雙欄（購物車欄收窄不擠壓），以 DevTools 768px／820px／1280px 截圖驗證

## 3. 商品管理與訂單查詢

- [x] 3.1 `ProductManagement` 表格補 `overflow-x-auto` 容器、篩選列加 `flex-wrap`，以 DevTools 360px 驗證主體無橫向捲軸、表格可區內橫滑
- [x] 3.2 `Orders` 篩選列加 `flex-wrap`（表格已有橫滑容器），以 DevTools 360px／768px 驗證搜尋、狀態篩選、開啟明細流程正常（Dialog 框體全寬可捲集中於 5.1 驗收）

## 4. 銷售報表

- [x] 4.1 摘要卡 `grid-cols-3` 改手機單欄（`sm:grid-cols-3` 還原），確認圖表區小螢幕高度正常，以 DevTools 360px 驗證三張摘要卡與圖表完整可讀
- [x] 4.2 以 DevTools 360px 開啟匯出確認框並完成一次匯出驗證流程（Dialog 框體全寬可捲集中於 5.1 驗收）

## 5. Dialog 統一與觸控尺寸

- [x] 5.1 統一各 Dialog 手機 `max-w-full`＋內容可捲＋按鈕列置底，以 DevTools 360px 逐一開啟結帳確認、匯出確認、匯入、訂單明細驗證
- [x] 5.2 主要操作按鈕觸控高度不小於 44px，以 DevTools 360px 目檢加購、結帳、數量增減、導覽項目無重疊且可點按驗證

## 6. 回歸與交付

- [x] 6.1 跑 `npm run lint --workspace=client`、`npm run test --workspace=client`、`npm run build --workspace=client` 全過，以三條指令零失敗驗證
- [x] 6.2 1280px 下 POS 結帳、查報表、匯出資料庫走一遍，以流程與顯示同變更前驗證桌面零變更
