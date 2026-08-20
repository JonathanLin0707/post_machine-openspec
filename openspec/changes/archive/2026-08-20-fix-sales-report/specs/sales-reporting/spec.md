## Purpose

修正銷售報表組件的 React key 警告和數據顯示問題，確保列表項有唯一 key 且 API 數據正確解析。

## MODIFIED Requirements

### Requirement: 今日銷售摘要 - 修正數據顯示

The system SHALL display today's sales summary with correct data from the API, ensuring all values are properly parsed and displayed.

#### Scenario: 顯示今日摘要
- **WHEN** 用戶進入報表頁面
- **THEN** 系統顯示今日的訂單總數、銷售總金額、平均客單價，數據正確從 API 解析

#### Scenario: 今日無銷售 - 修正零值顯示
- **WHEN** 今日無任何訂單
- **THEN** 系統顯示訂單數為 0，銷售額為 $0，不顯示 React 警告

### Requirement: 每日銷售報表 - 修正 key prop 和數據顯示

The system SHALL display daily sales statistics with correct chart keys using `day.date` as the unique identifier.

#### Scenario: 顯示每日銷售圖表
- **WHEN** 用戶查看每日銷售報表
- **THEN** 系統顯示過去 30 天的每日銷售額折線圖，每個數據點使用 `day.date` 作為 key

#### Scenario: 篩選日期範圍
- **WHEN** 用戶選擇自訂日期範圍
- **THEN** 系統顯示該範圍內的每日銷售數據，每個數據點使用正確的 key

### Requirement: 每月銷售報表 - 修正 key prop 和數據顯示

The system SHALL display monthly sales statistics with correct chart keys using `month.month + year` as the unique identifier.

#### Scenario: 顯示每月銷售圖表
- **WHEN** 用戶查看每月銷售報表
- **THEN** 系統顯示過去 12 個月的每月銷售額長條圖，每個數據點使用 `month.month + year` 作為 key

#### Scenario: 篩選年份
- **WHEN** 用戶選擇特定年份
- **THEN** 系統顯示該年份各月份的銷售數據，每個數據點使用正確的 key

### Requirement: 熱銷商品排行 - 修正 key prop 和數據顯示

The system SHALL display top-selling products with correct list keys using `product.productId` as the unique identifier.

#### Scenario: 顯示熱銷排行
- **WHEN** 用戶查看熱銷商品報表
- **THEN** 系統顯示銷售數量最高的前 10 個商品，每個項目使用 `product.productId` 作為 key

#### Scenario: 自訂排行數量
- **WHEN** 用戶設定排行榜顯示數量（如 TOP 5）
- **THEN** 系統顯示對應數量的熱銷商品，每個項目使用正確的 key

### Requirement: 報表匯出 - 修正數據解析

The system SHALL support exporting report data to CSV format with correctly parsed data.

#### Scenario: 匯出每日報表
- **WHEN** 用戶點擊「匯出 CSV」按鈕
- **THEN** 系統下載包含當前報表數據的 CSV 檔案，數據正確從 API 解析

#### Scenario: 匯出檔案格式
- **WHEN** 匯出完成
- **THEN** CSV 檔案包含日期、訂單數、銷售額等欄位，編碼為 UTF-8，數據正確解析

### Requirement: 銷售數據查詢 - 修正數據顯示

The system SHALL support querying historical order records with correctly parsed data.

#### Scenario: 查詢歷史訂單
- **WHEN** 用戶選擇特定日期
- **THEN** 系統顯示該日期的所有訂單列表，包含訂單號、時間、總金額、支付方式，數據正確從 API 解析
