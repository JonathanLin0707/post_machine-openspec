## Context

SalesReport.tsx 頁面目前呼叫後端 API `/reports/export` 來下載 CSV，但該 API 尚未實作。根據 spec-driven 開發流程，需要建立新的 CSV 匯出功能，整合今日摘要、每日銷售趨勢、每月銷售統計和熱銷商品 TOP 10 等數據。

## Goals / Non-Goals

**Goals:**
- 建立後端 `/api/reports/csv-export` POST endpoint 來生成 CSV 檔案
- CSV 包含完整銷售報表數據（今日摘要、每日趨勢、每月統計、熱銷商品）
- 提供適當的錯誤處理和使用者回饋機制
- 確保 CSV 檔案格式相容 Excel 和其他電子試算表軟體

**Non-Goals:**
- 不修改現有的 `/reports/daily`、`/reports/monthly`、`/reports/top-products` endpoints
- 不改變前端 SalesReport.tsx 的資料載入邏輯
- 不實作 ZIP 壓縮或其他檔案格式（僅支援 CSV）

## Decisions

### Endpoint Selection: POST vs GET
**Decision:** Use POST `/api/reports/csv-export` instead of GET
**Rationale:** 
- CSV 生成可能涉及較大的回應體，POST 更適合傳輸大數據
- 避免瀏覽器對 GET 請求的自動快取問題
- 符合 RESTful 最佳實踐（CSV export 是副作用操作）

**Alternatives Considered:**
- GET endpoint: 簡單但會導致快取和 large response 問題
- WebSocket streaming: 適合超大檔案，但增加複雜度

### Data Aggregation Strategy
**Decision:** Backend aggregates data from multiple internal endpoints
**Rationale:**
- 保持 API 層次的封裝性，前端不需要知道資料來源細節
- 允許後端統一處理資料格式和轉換邏輯
- 方便未來調整資料結構而不影響前端

**Alternatives Considered:**
- Frontend fetches all data separately: 增加網路請求次數
- Pre-aggregated endpoint: 需要額外的資料庫查詢或記憶體儲存

### CSV Format and Encoding
**Decision:** UTF-8 with BOM, standard CSV format
**Rationale:**
- Excel 現代版本支援 UTF-8，BOM 確保中文正確顯示（特別是舊版 Excel）
- 簡單格式易於維護和除錯
- 相容性良好（Excel、Google Sheets、LibreOffice）

**Alternatives Considered:**
- JSON format: 前端解析較複雜，且不符合 CSV 匯出預期
- TSV (tab-separated): 對於含 tab 的資料會產生問題

### Error Handling Strategy
**Decision:** Graceful degradation with user-friendly messages
**Rationale:**
- 後端錯誤不應直接暴露給使用者
- 提供明確的錯誤訊息引導使用者
- 記錄詳細日誌用於除錯

**Alternatives Considered:**
- Return empty CSV: 可能誤導使用者以為匯出成功
- Show technical error details: 洩露系統資訊，有資安風險

## Risks / Trade-offs

### [Risk] Backend aggregation may fail if source endpoints change
→ **Mitigation:** Add retry logic with exponential backoff, cache intermediate results

### [Risk] Large CSV files may timeout on slow connections
→ **Mitigation:** Implement streaming response, set appropriate Content-Length header

### [Risk] Memory usage spike during CSV generation
→ **Mitigation:** Stream CSV to response instead of building entire file in memory

### [Risk] Browser download behavior varies across browsers
→ **Mitigation:** Use standard filename format and Content-Disposition header

### [Trade-off] Single endpoint vs multiple endpoints
**Chosen:** Single aggregated endpoint for simplicity
**Trade-off:** Less granular control over which data sections to export
**Acceptable:** Most users want complete report; filtering can be added later if needed
