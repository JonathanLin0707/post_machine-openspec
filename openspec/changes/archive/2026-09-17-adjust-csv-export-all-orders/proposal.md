## Why

Current CSV export in SalesReport.tsx only provides aggregated sales data (daily summaries, monthly trends, top products). Store owners need detailed order-level data for accounting, auditing, and in‑depth analysis. Exporting all individual orders allows them to reconcile transactions, track specific items, and perform custom calculations that aren’t possible with aggregated reports.

## What Changes

- Modify the CSV export functionality to generate a list of **all orders** instead of aggregated sales statistics.
- Update the backend endpoint `/reports/csv-export` to query and return individual order records (order ID, datetime, items, total amount, payment method, etc.).
- Adjust the CSV format to include order‑specific columns (e.g., Order ID, Date, Items, Total, Payment).
- Update the frontend file name to reflect the new content (e.g., `orders_YYYY-MM-DD.csv`).
- Preserve existing error handling and loading states.

## Capabilities

### New Capabilities
<!-- None – we are modifying an existing capability. -->

### Modified Capabilities
- `reports/csv-export`: Requirement changes from “export aggregated sales data” to “export all individual orders”. The spec’s purpose, scenarios, and CSV format need to be updated to reflect the new order‑level export.

## Impact

- **Backend**: `server/src/services/csvExportService.ts` – new SQL query to fetch all orders; `formatAsCSV` method rewritten to output order rows.
- **API**: `server/src/routes/reports.ts` – endpoint logic updated (same route, different data).
- **Frontend**: `client/src/pages/SalesReport.tsx` – `exportCSV` function may need minor adjustments (file name change); no UI changes otherwise.
- **Shared types**: `shared/` may need a new `OrderExport` type if not reusing existing order types.
- **Database**: Requires read access to `orders` and `order_items` tables (already present).