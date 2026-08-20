## Context

See [proposal.md](../../proposal.md) - Why for motivation. The Today's Sales Summary component in the sales reporting page is displaying all values as 0 due to incorrect data parsing from the API response.

## Goals / Non-Goals

**Goals:**
- Fix data parsing logic to correctly extract and display today's sales metrics
- Ensure proper type conversion for numeric values (string → number)
- Handle edge cases: empty arrays, null values, missing fields
- Restore correct display of order count, total amount, and average transaction value

**Non-Goals:**
- Changing the API contract or data structure
- Modifying the overall sales reporting architecture
- Adding new metrics beyond what currently exists

## Decisions

### Data Parsing Approach

**Decision:** Implement a centralized data transformation layer that normalizes API responses before rendering.

**Rationale:** This approach separates data concerns from UI concerns, making the codebase more maintainable and testable. It also centralizes error handling and edge case management.

**Alternatives Considered:**
1. Parse directly in component render logic - rejected because it would scatter parsing logic across multiple components
2. Use a library like lodash for safe property access - rejected because native optional chaining (`?.`) is sufficient and has no additional dependencies

### Type Conversion Strategy

**Decision:** Use `Number()` wrapper with fallback to 0 for all numeric displays.

**Rationale:** This handles both string numbers from the API and actual number types uniformly. The fallback ensures graceful degradation when values are null or undefined.

**Alternatives Considered:**
1. Coerce with `parseInt()` - rejected because it would incorrectly parse decimal values
2. Use `parseFloat()` only - rejected because it doesn't handle non-numeric strings gracefully

### Null/Undefined Handling

**Decision:** Create a helper function `safeGet(obj, path, defaultValue)` for nested property access.

**Rationale:** This provides a consistent pattern for accessing potentially null/undefined properties throughout the codebase.

**Alternatives Considered:**
1. Use optional chaining everywhere - rejected because it's verbose and harder to read in complex expressions
2. Use `try/catch` blocks - rejected because it's overkill for property access errors

## Risks / Trade-offs

[Risk] The API might change its response structure → **Mitigation:** Add validation checks after parsing to detect unexpected null values and log warnings for debugging.

[Risk] Type conversion might fail silently for malformed data → **Mitigation:** Add unit tests with edge cases (null, undefined, string numbers, empty strings) to verify robustness.
