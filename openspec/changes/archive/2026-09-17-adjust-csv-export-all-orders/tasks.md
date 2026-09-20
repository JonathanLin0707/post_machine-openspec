## 1. Shared Types

- [x] 1.1 Add an `OrderExport` interface to `shared/types.ts` with fields for order ID, date/time, items, total amount, and payment method, and verify shared types compile with `npm run build --workspace=shared`

## 2. Backend Service (CsvExportService)

- [x] 2.1 Add `fetchAllOrders()` to `CsvExportService` that joins `orders`, `order_items`, and `products`, uses `GROUP_CONCAT` to aggregate each order's items as `Product (qty), Product (qty)`, and returns one record per order (orderId, datetime, items, total, paymentMethod); verify with a server unit test (run via `npx vitest run` from repo root) that seeded orders map to correctly grouped rows
- [x] 2.2 Rewrite `formatAsCSV` to emit an order export table with header row `Order ID,Date/Time,Items,Total Amount,Payment Method`, one CSV line per order, ISO 8601 datetime, currency with 2 decimals, properly quoted/escaped CSV cells, and a UTF‑8 BOM prefix; verify with a server unit test covering quoting, number formatting, empty input (header only), and BOM presence

## 3. Backend API (reports route)

- [x] 3.1 Update `POST /api/reports/csv-export` in `server/src/routes/reports.ts` to serve order data, set `Content-Type: text/csv; charset=utf-8` and `Content-Disposition` filename `orders_YYYY-MM-DD.csv`, and prefix the body with the UTF‑8 BOM; verify with a supertest e2e test (run via `npx vitest run`) asserting the response headers, filename, and CSV rows
- [x] 3.2 Ensure the try/catch in the route returns HTTP 500 with `{ error, message }` when order fetching fails (DB error); verify with a supertest test that forces a query failure and asserts a 500 JSON response

## 4. Frontend (SalesReport)

- [x] 4.1 Update `exportCSV` in `client/src/pages/SalesReport.tsx` so the downloaded file is named `orders_YYYY-MM-DD.csv`; verify client typecheck and lint pass (`npm run build --workspace=client`, `npm run lint:client`)
- [x] 4.2 Add empty-export handling: when the returned CSV contains only the header row (no order lines), show the message `暫無訂單資料可匯出` without downloading a file; verify with a client unit test that mocks the blob response and asserts the message is shown
- [x] 4.3 Update `exportCSV` error handling to match the spec's two error scenarios: on a server 500 response show `匯出 CSV 失敗：伺服器錯誤` (not the server's English message), and on network failure/timeout log the error to the console and show a user-friendly message with a retry hint (e.g. `匯出 CSV 失敗，請稍後再試`); follow the design non-goal of adding no new UI buttons or controls, and verify with a client unit test that mocks 500 and network-error responses

## 5. Integration Verification

- [x] 5.1 End‑to‑end check: seed products and orders into a temp DB, call `POST /api/reports/csv-export`, and verify the CSV starts with the UTF‑8 BOM, contains the header row and one row per order with correctly formatted ISO datetime and 2‑decimal currency, and that the empty‑orders case returns header‑only content
- [x] 5.2 Data freshness check: confirm the export query runs against the database at request time (new orders created after a prior request appear in the next export), and that the filename timestamp `orders_YYYY-MM-DD.csv` reflects the current date when the export is generated