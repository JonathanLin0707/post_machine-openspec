# Order Discount Specification

## Purpose

Defines how a discount entered on the cart screen is transmitted through checkout and persisted so that orders, order detail views, and sales reports all reflect the discounted total.

## Requirements

### Requirement: Discount is included in the checkout request
When a customer checks out with a discount amount set on the cart, the client SHALL send the discount (in currency units) as part of the order creation payload alongside the line items and payment method.

#### Scenario: Checkout with discount
- **WHEN** a customer applies a discount to the cart and confirms checkout
- **THEN** the request sent to `/api/orders` SHALL include `discount` equal to the amount shown in the confirmation dialog (subtotal minus total)

### Requirement: Discount is persisted on the order
When an order is created, the server SHALL store the received discount value on the `orders` row so that it survives subsequent reads.

#### Scenario: Order stored with discount
- **WHEN** an order is created with a discount of 50 and a subtotal of 200
- **THEN** the persisted order record SHALL have `total = 150`, `discount = 50`

### Requirement: Server validates the discount against line items
The server SHALL reject an order if the requested discount is negative or exceeds the computed subtotal of the accepted line items.

#### Scenario: Discount exceeds subtotal
- **WHEN** a checkout request includes a discount greater than the sum of `unit_price × quantity` for all valid items
- **THEN** the server SHALL respond with a 400 error and NOT create the order

### Requirement: Order detail reflects the discounted total
When an order (with or without discount) is retrieved by ID, the response SHALL include the stored `total`, `discount`, and `tax` fields so the UI can display the correct amounts.

#### Scenario: Fetching a discounted order
- **WHEN** a user opens an order that was created with a discount
- **THEN** the returned order object SHALL contain the discounted `total` and the original `discount` amount

### Requirement: Sales report totals include discounts
The daily, monthly, top-product, and today-summary figures produced by the sales report SHALL be computed from the stored `total` (already discounted) of each order.

#### Scenario: Daily total with discount
- **WHEN** orders created on a day include discounts that reduce their totals
- **THEN** the daily report's `total_sales` SHALL equal the sum of each order's stored `total`, not the undiscounted subtotal
