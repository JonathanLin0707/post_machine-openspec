## 1. Checkout request carries discount

- [x] 1.1 The order payload type lives inline in `client/src/App.tsx`; added `discount: discountAmount` to the POST body and verified TypeScript compiles (`npm run build --workspace=client`).
- [x] 1.2 Updated `POSProps.onCheckout` signature and the checkout call chain (POS → App) to thread `discountAmount`, so the amount shown in the confirmation dialog is sent with every checkout.

## 2. Server persists and validates discount

- [x] 2.1 Added a `discount REAL NOT NULL DEFAULT 0` column to the `orders` table schema plus an `ALTER TABLE ... ADD COLUMN` migration for pre-existing databases; verified via `server/src/database.ts`.
- [x] 2.2 Renamed the running total to `subtotal`, then compute `grandTotal = subtotal - discount` (tax stays 0); existing per-item stock validation loop is intact. Verified an order with discount 50 and subtotal 200 stores total 150.
- [x] 2.3 Validate `discount >= 0` up front and `discount <= subtotal` before inserting; both violations return HTTP 400 without creating the order.

## 3. Ensure reports read discounted totals

- [x] 3.1 Confirmed `server/src/routes/reports.ts` (daily, monthly, today) all aggregate the stored `total` column — no undiscounted field is summed — so figures reflect the discount once persisted.
- [x] 3.2 Ran `npm run build --workspace=client`, `--workspace=server`, and lint for both workspaces; all pass with zero errors/warnings.

## 4. Integration verification

- [x] 4.1 End-to-end: create an order through `POST /api/orders` with a discount, then fetch it via `GET /api/orders/:id` and confirm total/discount match; then generate the sales report CSV and confirm totals include the discount. Verify all three observable outputs agree. Verified end-to-end (subtotal 200, discount 50 → stored/fetched/report total = 150) plus server-side validation that a discount exceeding subtotal returns HTTP 400 without creating the order.
