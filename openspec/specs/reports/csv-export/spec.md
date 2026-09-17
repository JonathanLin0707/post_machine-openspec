# csv-export Specification

## Purpose

提供銷售報表數據的 CSV 匯出功能，讓使用者能下載包含今日摘要、每日銷售趨勢、每月銷售統計和熱銷商品 TOP 10 的完整報表檔案。

## Requirements

### Requirement: System generates CSV export for individual orders
The system SHALL generate a CSV file containing a list of all individual orders when the user requests CSV export from the SalesReport page.

#### Scenario: User clicks CSV export button
- **WHEN** user clicks "📥 匯出 CSV" button in SalesReport.tsx
- **THEN** system calls `/api/reports/csv-export` endpoint and returns CSV file with all order records
- **AND** CSV file contains headers for: Order ID, Date/Time, Items (product names and quantities), Total Amount, Payment Method

#### Scenario: Successful CSV download
- **WHEN** backend successfully queries all orders from the database
- **THEN** system returns CSV file with Content-Type: text/csv and appropriate filename format `orders_YYYY-MM-DD.csv`
- **AND** CSV content includes each order as a row with proper formatting (currency values with 2 decimals, dates in ISO format)

#### Scenario: No orders available
- **WHEN** backend has no orders to export (empty orders table)
- **THEN** system returns CSV file with headers only and empty data rows
- **AND** frontend displays appropriate message "暫無訂單資料可匯出"

#### Scenario: Backend API error during generation
- **WHEN** backend fails to fetch order data from database
- **THEN** system returns error response with status code 500
- **AND** frontend displays error message "匯出 CSV 失敗：伺服器錯誤"

#### Scenario: Network request failure
- **WHEN** network connection fails or request times out
- **THEN** system catches error and logs to console
- **AND** frontend displays user-friendly error message with retry option

### Requirement: CSV file format compliance for order export
The system SHALL ensure exported CSV files follow standard CSV formatting conventions for order data.

#### Scenario: Proper CSV encoding
- **WHEN** system generates CSV file with special characters (e.g., Chinese text, currency symbols)
- **THEN** system uses UTF-8 with BOM encoding for proper Excel compatibility
- **AND** numeric values are formatted with 2 decimal places for currency fields

#### Scenario: Column order consistency
- **WHEN** system exports order data
- **THEN** system maintains consistent column headers across all rows
- **AND** each order is on its own line with comma-separated values

### Requirement: Data freshness for order export
The system SHALL export current order data from the database at the time of the request.

#### Scenario: Fresh data export
- **WHEN** user requests CSV export
- **THEN** system queries the database for all orders at that moment
- **AND** exported data includes all orders up to the request time

#### Scenario: Data refresh before export
- **WHEN** user clicks "🔄 重新整理" then immediately clicks CSV export
- **THEN** system exports the latest order data from the new query
- **AND** filename timestamp reflects current time

### Requirement: Legacy export endpoint deprecation
The system SHALL mark GET `/reports/export` endpoint as deprecated and redirect to new POST endpoint.

#### Scenario: Client uses old endpoint after migration
- **WHEN** frontend continues using GET `/reports/export` after deprecation period
- **THEN** backend returns 410 Gone status with migration notice in response body
- **AND** response includes header `Deprecation: true` and `Link: </api/reports/csv-export>; rel="successor"`

#### Scenario: Client updates to new endpoint
- **WHEN** frontend switches to POST `/api/reports/csv-export` endpoint
- **THEN** backend processes request with same business logic as legacy endpoint
- **AND** response format remains compatible for seamless migration