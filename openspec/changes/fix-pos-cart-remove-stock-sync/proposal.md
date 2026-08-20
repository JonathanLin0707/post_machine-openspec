## Why

POS 購物車的「移除」按鈕目前僅將商品移出購物車，但未正確更新左側商品列表的庫存數量，導致庫存顯示不一致。此外，清空購物車功能也未同步恢復所有商品的庫存。此問題影響 POS 系統的準確性和使用者體驗。

## What Changes

- **Fix CartItem remove button**: 移除按鈕應呼叫 `useCartStore.removeItem()` 並同時更新商品庫存
- **Sync product stock with cart actions**: 左側商品列表的庫存應隨購物車操作（+、-、移除、清空）即時同步變化
- **Update handleAddToCart**: 加入購物車時正確扣減商品庫存
- **Update handleClearCart**: 清空購物車時恢復所有商品的庫存

## Capabilities

### New Capabilities

- `cart-stock-sync`: 購物車與商品庫存的同步機制，確保左右兩側的庫存數量始終一致

## Impact

- **Files Modified**:
  - `client/src/pages/POS.tsx` - 修正庫存同步邏輯
  - `client/src/components/CartItem.tsx` - 移除按鈕正確呼叫 store action
  - `client/src/store/CartContext.tsx` - 新增 stock 欄位並更新庫存管理
