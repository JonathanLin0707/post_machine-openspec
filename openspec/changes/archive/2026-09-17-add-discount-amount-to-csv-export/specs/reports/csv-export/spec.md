## MODIFIED Requirements

### Requirement: System generates CSV export for individual orders
The system SHALL generate a CSV file containing a list of all individual orders — including each order's discount amount — when the user requests CSV export from the SalesReport page.

#### Scenario: User clicks CSV export button
- **WHEN** user clicks "📥 匯出 CSV" button in SalesReport.tsx
- **THEN** system calls `/api/reports/csv-export` endpoint and returns CSV file with all order records
- **AND** CSV file contains headers for: Order ID, Date/Time, Items (product names and quantities), Total Amount, Discount, Payment Method

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

#### Scenario: Export includes discount amount
- **WHEN** an order in the database was created with a non-zero discount
- **THEN** the order's CSV row SHALL include a Discount Amount column equal to the stored discount, formatted with 2 decimals
- **AND** the Total Amount column SHALL remain the already-discounted order total