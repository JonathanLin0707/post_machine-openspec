## Context

See [proposal.md](../../proposal.md) - Why for the motivation behind this change.

The sales-reporting component currently has two critical issues:
1. React warnings due to missing unique `key` props on list items in `.map()` functions
2. Data display showing 0 values because API data is not being properly parsed or displayed

## Goals / Non-Goals

**Goals:**
- Add unique `key` props to all list items in the sales report component
- Ensure API data is correctly parsed and displayed for all metrics (daily/monthly sales, top products)
- Fix chart keys to use appropriate unique identifiers (`day.date`, `month.month + year`, `product.productId`)

**Non-Goals:**
- Changing the overall architecture of the sales reporting feature
- Modifying the API contract or data model
- Adding new features beyond fixing the existing issues

## Decisions

### Decision 1: Use stable unique keys for all list items

**Rationale:** React requires unique keys for list items to efficiently reconcile elements between renders. Using unstable indices causes unnecessary re-renders and potential bugs.

**Alternatives considered:**
- Using array index as key - REJECTED because it doesn't work well when items are filtered, sorted, or added/removed
- Using composite keys (e.g., `${date}-${value}`) - REJECTED because it's error-prone and doesn't guarantee uniqueness
- Using stable identifiers from the data source - ACCEPTED as the best practice

**Implementation:**
- Daily sales chart: Use `day.date` as the key for each data point
- Monthly sales chart: Use `${month.month}-${year}` as the key (combining month and year for uniqueness)
- Top products list: Use `product.productId` as the key for each product item

### Decision 2: Ensure proper data parsing from API response

**Rationale:** The component must correctly parse and transform API data before rendering to avoid displaying incorrect or zero values.

**Alternatives considered:**
- Rendering raw API data directly - REJECTED because it may not match the expected UI structure
- Adding intermediate transformation layer - ACCEPTED to ensure data is properly formatted for display

**Implementation:**
- Add data transformation functions that map API response fields to component props
- Handle edge cases like empty arrays, null values, and missing fields
- Ensure numeric values are properly parsed (e.g., string numbers converted to actual numbers)

### Decision 3: Fix chart key generation

**Rationale:** Chart libraries require unique keys for their data points. Incorrect keys can cause rendering issues or incorrect data visualization.

**Alternatives considered:**
- Using timestamp as key - REJECTED because it may not be available in the data and is less readable
- Using auto-generated UUIDs - REJECTED because it's unnecessary overhead
- Using composite keys from existing data fields - ACCEPTED as the most efficient approach

## Risks / Trade-offs

[React key warnings may persist] → Mitigation: Ensure all `.map()` calls have unique keys; verify with React DevTools

[Data still shows 0 values] → Mitigation: Add console logging to trace data flow; ensure API response structure matches expectations

[Chart rendering issues] → Mitigation: Test with various data sets; ensure chart library receives properly formatted data

[Performance impact from stable keys] → Mitigation: Minimal; React's reconciliation is optimized for stable keys and will only re-render when necessary
