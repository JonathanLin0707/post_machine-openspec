## Why

SalesReport.tsx 中的「📥 匯出 CSV」按鈕目前呼叫後端 API `/reports/export`，但該 API 尚未實作或返回錯誤，導致前端使用者無法下載銷售報表數據。需要建立完整的 CSV 匯出功能，讓使用者能取得今日摘要、每日趨勢、每月統計和熱銷商品等資料。

## What Changes

- **ADDED**: New POST endpoint `/api/reports/csv-export` that generates CSV file containing all sales report data
- **MODIFIED**: Frontend SalesReport.tsx to use new endpoint with proper error handling and user feedback
- **BREAKING**: Remove deprecated GET `/reports/export` endpoint after migration period

## Capabilities

### New Capabilities

- `reports/csv-export`: Server-side CSV generation capability that aggregates daily reports, monthly summaries, and top products into a single downloadable file

## Impact

- **API Layer**: New endpoint in backend services layer
- **Frontend**: SalesReport.tsx will be updated to use new endpoint with improved error messages
- **Data Flow**: Backend must aggregate data from multiple sources (daily/monthly reports, top products) and format as CSV
