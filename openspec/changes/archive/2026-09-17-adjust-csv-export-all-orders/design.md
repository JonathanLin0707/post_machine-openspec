## Context

The sales report page (`SalesReport.tsx`) currently exports aggregated sales data (daily summaries, monthly trends, top products) via the `/reports/csv-export` endpoint. Store owners require detailed order-level data for accounting and auditing. The change will modify the same endpoint to query and return all individual orders instead of aggregated statistics, with a new CSV format.

## Goals / Non-Goals

**Goals:**
- Replace aggregated CSV export with a list of all individual orders.
- Maintain the same endpoint path (`/reports/csv-export`) and HTTP method (POST).
- Preserve existing error handling and loading state behavior in the frontend.
- Ensure CSV file is UTF‑8 encoded with BOM for Excel compatibility.

**Non-Goals:**
- Do not change the UI layout or add new buttons; only adjust the file name and content.
- Do not implement pagination or streaming for large datasets (assumed manageable order volume).
- Do not alter other report endpoints or data.
- Do not introduce new authentication or authorization mechanisms.

## Decisions

1. **SQL query design**: Join `orders` and `order_items` tables to fetch order details, including product names. Use `GROUP_CONCAT` to aggregate items per order into a single string (e.g., "Product A (2), Product B (1)"). This avoids multiple queries and keeps the CSV flat.
   - *Alternative*: Fetch orders and items separately, then merge in code. Rejected because it adds complexity and round‑trips.
2. **CSV format**: Columns: `Order ID, Date/Time, Items, Total Amount, Payment Method`. Use ISO 8601 for dates, currency formatted with two decimals. Include a header row.
3. **Filename**: Change from `sales_report_YYYY-MM-DD.csv` to `orders_YYYY-MM-DD.csv` to reflect content.
4. **Error handling**: Reuse existing try/catch structure; return HTTP 500 on database errors, frontend displays the same alert.
5. **Type definitions**: Reuse existing `Order` type from `shared/` if it includes required fields; otherwise create a minimal `OrderExport` interface in `shared/` to avoid duplication.

## Risks / Trade-offs

- **Performance**: Large order volumes may generate big CSV files and slow queries. *Mitigation*: Assume moderate data volume; if needed later, add date-range filter (out of scope now).
- **Data consistency**: The query runs at request time, so exports reflect the state at that moment (acceptable per spec).
- **Backward compatibility**: Existing scripts expecting aggregated data will break. *Mitigation*: This is an intentional behavior change; notify users via release notes.

## Migration Plan

1. Deploy backend changes (new query, updated `formatAsCSV`).
2. Deploy frontend changes (updated filename in `exportCSV`).
3. No database migrations required (existing tables suffice).
4. Rollback: revert both deployments; the old aggregated export resumes.

## Open Questions

None. All critical decisions are resolved based on the existing codebase and requirements.