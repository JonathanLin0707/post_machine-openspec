## Why

修正銷售報表組件中的兩個關鍵問題：
1. React 警告：列表項缺少唯一的 `key` prop，導致渲染錯誤
2. 數據顯示為 0：API 返回的數據沒有正確解析或顯示

## What Changes

- **SalesReport.tsx**: 
  - 在所有 `.map()` 函數中為列表元素添加正確的 `key` prop
  - 修正每日銷售趨勢圖表的 key 使用 `day.date`
  - 修正每月銷售統計圖表的 key 使用 `month.month + year`（組合唯一鍵）
  - 修正熱銷商品列表的 key 使用 `product.productId`
  - 確保數據正確從 API 解析並顯示

## Capabilities

### New Capabilities

- `sales-report-fix`: 修正銷售報表組件的 React key 警告和數據顯示問題
