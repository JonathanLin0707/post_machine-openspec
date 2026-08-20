## Context

POS 系統目前存在以下問題：
1. CartItem 組件的「移除」按鈕僅呼叫 `onDecrease`（減少數量），未正確從購物車移除商品
2. 左側商品列表的庫存更新依賴於 `handleAddToCart` 和產品重新載入，而非即時同步
3. 清空購物車時未恢復所有商品的庫存

## Goals / Non-Goals

**Goals:**
- 修正「移除」按鈕行為，使其正確移出購物車並更新庫存
- 確保左側商品列表的庫存數量隨購物車操作（+、-、移除、清空）即時同步變化
- 保持現有的購物車功能不變

**Non-Goals:**
- 不修改產品 API 或後端邏輯
- 不改變 CartContext 的核心結構，僅新增 stock 欄位和相關方法

## Decisions

### Decision 1: CartItem 使用 store action 而非手動管理庫存

**Rationale**: 使用 `useCartStore.removeItem()` 確保購物車狀態一致性，避免重複編碼。

**Alternatives Considered**:
- 在 CartItem 組件中直接修改 local state → 不推薦，違反單一資料來源原則
- 引入新的 API endpoint → 超出本變更範圍

### Decision 2: CartContext 新增 stock 欄位和庫存管理方法

**Rationale**: CartItem 需要追蹤庫存以進行驗證和顯示。

**Implementation**:
- `CartItem` interface 新增 `stock?: number` 欄位
- `addItem` 接收 stock 參數
- `removeItem` 僅移除項目，不處理庫存（庫存由外部管理）
- 保留現有的 `increaseQuantity`/`decreaseQuantity` 邏輯

### Decision 3: POS 頁面負責同步商品列表的庫存

**Rationale**: POS 頁面持有產品資料，最適合在購物車操作時更新產品列表。

**Implementation**:
- `handleAddToCart`: 成功後立即更新產品列表的 stock
- `handleIncreaseQuantity`: 成功後立即更新產品列表的 stock
- `handleDecreaseQuantity`: 減少後立即更新產品列表的 stock
- `handleClearCart`: 清空時恢復所有產品的庫存

### Decision 4: CartItem「移除」按鈕呼叫 removeItem 而非 decreaseQuantity

**Rationale**: 「移除」應將商品從購物車完全移除，而非僅減少數量。

**Implementation**:
- 移除按鈕直接呼叫 `useCartStore.getState().removeItem(productId)`
- 同時更新產品列表的庫存

## Risks / Trade-offs

### Risk: 庫存同步可能與後端不同步

**Mitigation**: 本變更僅處理前端狀態，後端庫存管理由 API 負責。

### Risk: 清空購物車時庫存恢復可能失敗

**Mitigation**: 使用 try-catch 包裹庫存恢復邏輯，失敗時記錄日誌但不阻止操作。
