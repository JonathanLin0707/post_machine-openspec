## Context

See proposal.md for motivation. The cart UI already computes a discounted total and displays it, but the checkout request only forwards product IDs and quantities. The server recomputes `total = Σ(price × quantity)` in `POST /api/orders`, so any discount is dropped before being written to the database. Because sales reports read totals from that same table, they inherit the wrong (undiscounted) figures.

## Goals / Non-Goals

**Goals:**
- Carry the customer-selected discount through checkout into the persisted order row.
- Validate the discount server-side so it can never exceed the accepted subtotal.
- Ensure orders, order-detail views, and sales reports all read from the stored (discounted) total.

**Non-Goals:**
- Changing how discounts are entered in the UI (the cart already supports a manual amount).
- Introducing tax or other pricing rules — tax remains 0 as today.
- Persisting per-line-item discounts; only an order-level discount is in scope.

## Decisions

### 1. Discount travels in the checkout payload, server persists it
**Decision:** Extend `POST /api/orders` to accept a numeric `discount` field and store it on the `orders.total`, `orders.discount` columns. The client already computes the discounted total locally, so no new UI state is needed — only the request body changes.

**Alternative considered:** Computing discount server-side from some rule (coupon codes, thresholds). Rejected: discounts are operator-entered amounts in this POS; inventing rules would change behavior beyond scope and duplicate existing UI logic.

### 2. Server recomputes subtotal but subtracts received discount
**Decision:** Keep the existing per-item subtotal/stock validation loop unchanged, then set `total = max(0, subtotal − discount)` instead of `total = subtotal`. This preserves all existing stock-validation guarantees while folding in the discount at write time.

**Alternative considered:** Storing discounted subtotals on each line item. Rejected: it complicates the schema and report queries; an order-level discount is sufficient for this change.

### 3. Reports already correct once total is persisted
**Decision:** No changes to `reports.ts` are required — its SQL sums `total`, which will now be discounted. The fix is purely upstream (persisting the value).

## Risks / Trade-offs

- **[Negative discount]** A client could send a negative or oversized discount. **Mitigation:** validate `discount >= 0 && discount <= subtotal`; reject with 400 otherwise, so bad input never creates an order.
- **[Existing orders unaffected]** Orders created before this change have no discount value. **Mitigation:** treat missing/zero discount as 0 in the insert path (default), keeping historical data intact.
- **[Tax stays zero]** Discount reduces `total` but tax is computed on `total`; since tax is already 0, no behavior shift there.
