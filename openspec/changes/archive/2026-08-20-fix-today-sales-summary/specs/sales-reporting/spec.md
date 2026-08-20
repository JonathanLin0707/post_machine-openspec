# sales-reporting Specification (Delta)

## ADDED Requirements

### Requirement: 今日銷售摘要 - 增強數據處理

系統 SHALL 提供今日銷售摘要，包含訂單數、總銷售額、平均客單價，並增強數據解析邏輯以處理各種邊界情況。

#### Scenario: 顯示今日摘要
- **WHEN** 用戶進入報表頁面
- **THEN** 系統顯示今日的訂單總數、銷售總金額、平均客單價，數據正確從 API 解析

#### Scenario: 今日無銷售 - 修正零值顯示
- **WHEN** 今日無任何訂單
- **THEN** 系統顯示訂單數為 0，銷售額為 $0，不顯示 React 警告

#### Scenario: 處理 null/undefined 值
- **WHEN** API 回應中的 sales metrics 欄位為 null 或 undefined
- **THEN** 系統使用預設值 0 顯示，不拋出錯誤或不顯示 React 警告

#### Scenario: 處理非數值字串
- **WHEN** API 回應中的 sales metrics 欄位包含非數值字串（如 "abc"）
- **THEN** 系統解析為 0，不拋出錯誤或不顯示 React 警告
