## Context

See proposal.md — Why.

The per-order CSV export is produced by `CsvExportService` (`server/src/services/csvExportService.ts`): `fetchAllOrders()` joins `orders`/`order_items`/`products` and `formatAsCSV()` emits `Order ID,Date/Time,Items,Total Amount,Payment Method`, served by `POST /api/reports/csv-export` (`server/src/routes/reports.ts`). Orders persist an order-level `discount` column (schema + migration in `server/src/database.ts`, set at creation in `server/src/routes/orders.ts`), and an order's `total` is already discounted. The frontend's empty-export detection only counts non-blank lines, so an added column does not affect it.

## Goals / Non-Goals

**Goals:**
- Add a Discount column to the per-order CSV export, sourced from `orders.discount`, formatted with 2 decimals.
- Extend the shared `OrderExport` type so the schema, query, and output stay typed.

**Non-Goals:**
- No new UI controls, no change to download flow, filename, or endpoint.
- No change to sales-report aggregates (daily/monthly/top-products) — they already read stored discounted totals.
- No per-item discount modeling; only the order-level discount.

## Decisions

1. **Data source: `orders.discount` (Decision #1).** The stored discount is the single source of truth — already validated and persisted at order creation (see `order-discount` spec). Alternative: recompute discount as `subtotal − total` per row at export time; rejected because it duplicates logic, risks drifting from what the customer was actually charged, and does not extend to per-item discounts.

2. **Column name and placement: header `Discount`, positioned between `Total Amount` and `Payment Method`** (Decision #2). Matches the header list in `specs/reports/csv-export/spec.md` and keeps the money columns adjacent. Alternative considered: `Discount Amount` — lengthier and not what the spec names the column.

3. **Typing and formatting.** `OrderExport.discount: number` (`shared/types.ts`); `formatAsCSV()` renders it with `Number(discount).toFixed(2)`, the same code path that formats `Total Amount`, so currency formatting stays consistent.

4. **Null/absent handling:** map `discount: Number(row.discount) || 0` (mirrors the orders route's existing normalization), so legacy rows without a discount export `0.00`.

5. **Query change is additive:** add `o.discount as discount` to the `fetchAllOrders()` SELECT and the row mapping; no JOIN or grouping change.

## Risks / Trade-offs

- [Pre-existing DBs missing `discount`] → Migration already added the column with `DEFAULT 0` (`database.ts`); row mapping coalesces via `Number(...) || 0`.
- [CSV consumers with fixed column expectations] → New column is additive and keeps the last field (`Payment Method`); strict fixed-schema parsers need updating — acceptable, captured in the spec.
- [Formatting drift between Total and Discount] → Both values formatted by the same `toFixed(2)` path in `formatAsCSV`.

## Migration Plan

None required — no schema, API, or route change; the export column is additive. Rollback is reverting the service/type/test changes.