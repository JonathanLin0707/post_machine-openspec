# database Specification

## Purpose
建立 SQLite 資料庫架構，儲存商品、訂單及銷售數據，提供資料持久化與查詢能力。

## Requirements

### Requirement: 商品資料表
系統 SHALL 建立 products 資料表，儲存商品的基本資訊。

#### Scenario: 商品表結構
- **WHEN** 資料庫初始化
- **THEN** 系統建立 products 表，包含 id、name、price、barcode、category、stock、image_url、created_at、updated_at 欄位

#### Scenario: 條碼唯一性約束
- **WHEN** 嘗試插入重複條碼的商品
- **THEN** 資料庫拒絕插入並回傳錯誤

#### Scenario: 商品名稱必要性
- **WHEN** 嘗試插入無名稱的商品
- **THEN** 資料庫拒絕插入並回傳錯誤

### Requirement: 訂單資料表
系統 SHALL 建立 orders 資料表，儲存訂單資訊。

#### Scenario: 訂單表結構
- **WHEN** 資料庫初始化
- **THEN** 系統建立 orders 表，包含 id、total、tax、payment_method、status、created_at 欄位

#### Scenario: 訂單狀態預設值
- **WHEN** 新增訂單
- **THEN** 訂單狀態預設為 "completed"

### Requirement: 訂單明細資料表
系統 SHALL 建立 order_items 資料表，儲存訂單的商品明細。

#### Scenario: 訂單明細表結構
- **WHEN** 資料庫初始化
- **THEN** 系統建立 order_items 表，包含 id、order_id、product_id、quantity、unit_price、subtotal 欄位

#### Scenario: 外鍵約束
- **WHEN** 新增訂單明細
- **THEN** 系統驗證 order_id 和 product_id 存在於對應資料表

### Requirement: 資料庫索引
系統 SHALL 建立適當的索引以優化查詢效能。

#### Scenario: 建立索引
- **WHEN** 資料庫初始化
- **THEN** 系統建立以下索引：products(barcode)、products(category)、orders(created_at)、order_items(order_id)

### Requirement: 資料庫連接管理
系統 SHALL 提供 SQLite 資料庫連接管理，支援連接池與錯誤處理。

#### Scenario: 成功連接資料庫
- **WHEN** 後端服務啟動
- **THEN** 系統成功連接到 SQLite 資料庫檔案

#### Scenario: 資料庫檔案不存在
- **WHEN** 資料庫檔案不存在
- **THEN** 系統自動建立新的資料庫檔案並初始化 Schema

#### Scenario: 連接錯誤處理
- **WHEN** 資料庫連接發生錯誤
- **THEN** 系統記錄錯誤日誌並回傳適當的錯誤回應
