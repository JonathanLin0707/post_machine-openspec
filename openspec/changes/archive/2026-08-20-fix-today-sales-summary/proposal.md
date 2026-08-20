## Why

The "今日銷售摘要" (today's sales summary) component currently displays all values as 0, even when sales data exists. This prevents users from seeing today's actual sales performance and undermines trust in the reporting system. The issue affects the display of order count, total sales amount, and average transaction value.

## What Changes

- Fix data parsing logic to correctly extract and display today's sales metrics from API response
- Ensure numeric values are properly converted (e.g., string numbers to actual numbers)
- Handle edge cases: empty arrays, null values, missing fields
- Verify all metrics display correct values instead of 0

## Capabilities

### Modified Capabilities

- `sales-reporting`: The "今日銷售摘要" requirement needs data parsing fixes to correctly display today's sales metrics (order count, total amount, average transaction value)

## Impact

- Affected component: Today's Sales Summary widget in the sales reporting page
- API response fields need proper parsing for: orderCount, totalAmount, avgTransactionValue
- No breaking changes; existing functionality preserved, only display values corrected
