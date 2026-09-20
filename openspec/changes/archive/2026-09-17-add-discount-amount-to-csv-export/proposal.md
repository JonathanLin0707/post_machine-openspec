## Why

CSV 匯出目前只包含每筆訂單的 `Total Amount`（已扣除折扣後的總額），缺少優惠金額欄位，使用者無法在匯出的報表中核對折扣金額，造成對帳與稽核困難。

## What Changes

- 在訂單 CSV 匯出中加入「Discount Amount」欄位，顯示該筆訂單儲存的優惠金額（2 位小數）
- CSV header 更新為：`Order ID, Date/Time, Items, Total Amount, Discount, Payment Method`（欄位順序以 spec 定案為準）
- 匯出查詢與格式化邏輯納入 `orders.discount` 欄位；`Total Amount` 維持為已扣折扣的訂單總額
- 更新共享型別、伺服器服務與對應測試以涵蓋新欄位

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `reports/csv-export`: 訂單 CSV 匯出的內容新增優惠金額（Discount Amount）欄位

## Impact

- `shared/types.ts`: `OrderExport` 介面新增 `discount` 欄位
- `server/src/services/csvExportService.ts`: `fetchAllOrders()` 查詢加入 `o.discount`、`formatAsCSV()` 新增欄位 header 與輸出
- `server/src/routes/reports.ts`: 路由維持不變（資料來自服務層）
- `client/src/pages/SalesReport.tsx`: 空匯出偵測邏輯（header 行數）不受影響，無前端改動預期
- 測試: `server/__tests__/csvExportService.test.ts`、`csvExport.e2e.test.ts`（及必要時 client 測試）需更新以反映新欄位
- 資料來源: `orders.discount`（`database.ts` 已有欄位與 migration，無資料庫更動）