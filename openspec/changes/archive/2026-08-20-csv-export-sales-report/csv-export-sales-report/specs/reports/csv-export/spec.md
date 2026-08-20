## Purpose

提供銷售報表數據的 CSV 匯出功能，讓使用者能下載包含今日摘要、每日銷售趨勢、每月銷售統計和熱銷商品 TOP 10 的完整報表檔案。

## ADDED Requirements

### Requirement: System generates CSV export for sales reports
The system SHALL generate a CSV file containing aggregated sales data when the user requests CSV export from the SalesReport page.

#### Scenario: User clicks CSV export button
- **WHEN** user clicks "📥 匯出 CSV" button in SalesReport.tsx
- **THEN** system calls `/api/reports/csv-export` endpoint and returns CSV file with all sales data
- **AND** CSV file contains headers for: orderCount, totalSales, averageOrderValue (daily), month/year (monthly), product name/ID/quantity/revenue (top products)

#### Scenario: Successful CSV download
- **WHEN** backend successfully aggregates data from daily reports, monthly reports, and top products endpoints
- **THEN** system returns CSV file with Content-Type: text/csv and appropriate filename format `sales_report_YYYY-MM-DD.csv`
- **AND** CSV content includes all available data rows with proper formatting

#### Scenario: No data available
- **WHEN** backend has no sales data to export (empty arrays for all data sources)
- **THEN** system returns CSV file with headers only and empty data rows
- **AND** frontend displays appropriate message "暫無銷售數據可匯出"

#### Scenario: Backend API error during generation
- **WHEN** backend fails to fetch or aggregate data from internal endpoints
- **THEN** system returns error response with status code 500
- **AND** frontend displays error message "匯出 CSV 失敗：伺服器錯誤"

#### Scenario: Network request failure
- **WHEN** network connection fails or request times out
- **THEN** system catches error and logs to console
- **AND** frontend displays user-friendly error message with retry option

### Requirement: CSV file format compliance
The system SHALL ensure exported CSV files follow standard CSV formatting conventions.

#### Scenario: Proper CSV encoding
- **WHEN** system generates CSV file with special characters (e.g., Chinese text, currency symbols)
- **THEN** system uses UTF-8 with BOM encoding for proper Excel compatibility
- **AND** numeric values are formatted with 2 decimal places for currency fields

#### Scenario: Column order consistency
- **WHEN** system exports multiple data sections (daily, monthly, top products)
- **THEN** system maintains consistent column headers across all sections
- **AND** each section is clearly separated with blank rows or section markers

### Requirement: Data freshness
The system SHALL export current sales data from the most recent API responses.

#### Scenario: Fresh data export
- **WHEN** user requests CSV export after data has been loaded
- **THEN** system exports data from current state of dailyData, monthlyData, and topProducts
- **AND** exported data reflects any changes made since last page load

#### Scenario: Data refresh before export
- **WHEN** user clicks "🔄 重新整理" then immediately clicks CSV export
- **THEN** system exports the refreshed data from the new API responses
- **AND** filename timestamp reflects current time, not cached data time

## MODIFIED Requirements

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
