## 1. Shared Type

- [x] 1.1 Add `discount: number` to the `OrderExport` interface in `shared/types.ts` and verify shared types compile with `npm run build --workspace=shared`

## 2. Server Implementation

- [x] 2.1 Extend `fetchAllOrders()` in `csvExportService.ts` to SELECT `o.discount as discount` and map each row's `discount` as `Number(row.discount) || 0` (per design Decision #4); verify with a server unit test (run `npx vitest run server/__tests__/csvExportService.test.ts` from repo root) that a seeded order's stored discount maps to the row's `discount` field
- [x] 2.2 Update `formatAsCSV()` to emit header `Order ID,Date/Time,Items,Total Amount,Discount,Payment Method` and render each order's `discount` with `Number(discount).toFixed(2)` between Total Amount and Payment Method; verify with the server unit test asserting the new header, a non-zero discount cell formatted with 2 decimals, and `0.00` for an order without a discount

## 3. Verification

- [x] 3.1 Update the e2e test (`server/__tests__/csvExport.e2e.test.ts`) to seed an order with a non-zero discount, call `POST /api/reports/csv-export`, and assert the Discount column appears in the header and each row with 2-decimal formatting while Total Amount stays the already-discounted total; verify via `npx vitest run server/__tests__/csvExport.e2e.test.ts` from repo root
- [x] 3.2 Regression check: run the full server test suite from repo root (`npx vitest run`) and the client suite from the `client/` directory, confirming the new header breaks nothing (including the empty-orders header-only case and client empty-export detection)