## 1. CartContext 更新

- [x] 1.1 在 CartItem interface 新增 `stock?: number` 欄位

## 2. POS 頁面庫存同步邏輯

- [x] 2.1 在 `handleAddToCart` 成功後更新產品列表的 stock
- [x] 2.2 在 `handleIncreaseQuantity` 成功後更新產品列表的 stock
- [x] 2.3 移除 `handleDecreaseQuantity`（改用 removeItem）
- [x] 2.4 修改 `handleClearCart` 以恢復所有商品的庫存

## 3. CartItem 組件修正

- [x] 3.1 將「移除」按鈕改為呼叫 `onRemove`（移出購物車）
- [x] 3.2 POS 頁面負責同步產品列表的庫存

## 4. 測試與驗證

- [x] 4.1 測試加入購物車時庫存即時減少
- [x] 4.2 測試增加購物車數量時庫存即時增加
- [x] 4.3 移除減少購物車數量功能（改用 removeItem）
- [x] 4.4 測試移除按鈕正確移出商品並更新庫存
- [x] 4.5 測試清空購物車時所有庫存恢復

## 5. 編譯驗證

- [x] 5.1 修正 CartContext 類型定義
- [x] 5.2 修正 CartItem 組件 stock 可選性處理
- [x] 5.3 修正 POS 頁面 handleIncreaseQuantity 參數
- [x] 5.4 驗證編譯成功無類型錯誤

## 6. Bug 修正

- [x] 6.1 修正「移除」按鈕行為（移出購物車而非減少數量）
- [x] 6.2 更新 CartItem 組件參數為 onRemove
- [x] 6.3 添加 handleRemoveItem 處理庫存同步
- [x] 6.4 恢復「-」按鈕功能並呼叫 decreaseQuantity
- [x] 6.5 修正 CartItem 新增 onDecrease prop
- [x] 6.6 驗證編譯成功無類型錯誤
