# database Specification

## Purpose
建立 PostgreSQL 資料庫架構，儲存商品、訂單及銷售數據，提供資料持久化與查詢能力。

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
系統 SHALL 提供 PostgreSQL 資料庫連接管理，支援連接池與錯誤處理，並透過 DATABASE_URL 環境變數取得連線資訊。

#### Scenario: 成功連接資料庫
- **WHEN** 後端服務啟動
- **THEN** 系統透過 DATABASE_URL 成功連接到 PostgreSQL 並初始化 Schema

#### Scenario: 資料庫檔案不存在
- **WHEN** 首次連接到尚未初始化 Schema 的 PostgreSQL
- **THEN** 系統自動建立資料表與索引並完成 Schema 初始化

#### Scenario: 連接錯誤處理
- **WHEN** 資料庫連接發生錯誤
- **THEN** 系統記錄錯誤日誌並回傳適當的錯誤回應

### Requirement: 外部資料庫持久化
系統 SHALL 將商品、訂單與訂單明細資料持久化於外部 PostgreSQL 資料庫，使其在服務 redeploy、restart 或 spin down 之後依然存在。

#### Scenario: 資料跨部署存活
- **WHEN** 服務 redeploy、restart 或 spin down 後重新啟動
- **THEN** 既有訂單與商品資料仍可透過 API 取得

#### Scenario: 不依賴本地資料檔
- **WHEN** 後端服務啟動
- **THEN** 系統只使用外部 PostgreSQL 資料庫，不再讀寫本地 SQLite 資料檔

### Requirement: 一次性資料遷移
系統 SHALL 提供一次性遷移，將既有 SQLite 資料庫中的 products、orders、order_items 資料匯入 PostgreSQL。

#### Scenario: 遷移成功
- **WHEN** 執行遷移腳本且 SQLite 資料庫可讀取
- **THEN** products、orders、order_items 的資料完整匯入 PostgreSQL，且內容與來源保持一致

#### Scenario: 遷移後唯一資料來源
- **WHEN** 遷移完成後
- **THEN** 系統以 PostgreSQL 作為唯一資料來源

### Requirement: 資料庫備份匯出
系統 SHALL 提供資料庫備份匯出，下載包含 products、orders、order_items 完整資料的 JSON 備份檔。

#### Scenario: 匯出資料庫備份
- **WHEN** 使用者點擊「匯出資料庫」按鈕並在確認視窗中確認
- **THEN** 系統下載包含全部商品、訂單與訂單明細資料的 JSON 備份檔

#### Scenario: 匯出失敗
- **WHEN** 資料讀取或備份產生發生錯誤
- **THEN** 系統回傳錯誤訊息，且不產出缺漏的備份檔案

### Requirement: 資料庫備份匯入
系統 SHALL 接受 JSON 備份檔中的 products、orders、order_items 資料，並以「完整取代」或「合併」模式更新 PostgreSQL 資料庫。

#### Scenario: 完整取代模式
- **WHEN** 使用者上傳有效的 JSON 備份檔並選擇「完整取代」模式
- **THEN** 系統清空 products、orders、order_items 的既有資料後，依備份檔內容重建三張資料表

#### Scenario: 合併模式
- **WHEN** 使用者上傳有效的 JSON 備份檔並選擇「合併」模式
- **THEN** 系統以主鍵 id 比對三張資料表，id 存在的列更新、id 不存在的列插入，未出現於備份檔中的既有資料予以保留

### Requirement: 匯入格式驗證
系統 SHALL 在匯入前驗證 JSON 內容符合備份格式；格式無效時拒絕匯入。

#### Scenario: 有效備份格式
- **WHEN** JSON 內容包含 exportedAt、products、orders、orderItems 欄位且各欄位型別正確
- **THEN** 系統執行匯入

#### Scenario: 無效備份格式
- **WHEN** JSON 內容缺少必要欄位、欄位型別不符或不是合法的 JSON
- **THEN** 系統回傳錯誤訊息，且不更改任何既有資料

### Requirement: 匯入失敗的整體性
系統 SHALL 將一次匯入視為單一交易，任一步驟失敗時整體回滾，不留下部分更新。

#### Scenario: 匯入過程發生錯誤
- **WHEN** 匯入過程發生錯誤（例如外鍵不一致、唯一性衝突或資料庫連線失敗）
- **THEN** 系統回滾所有變更並回傳錯誤訊息，資料庫維持匯入前的狀態

#### Scenario: 空備份內容
- **WHEN** 備份檔格式有效且 products、orders、orderItems 皆為空陣列
- **THEN** 系統在「完整取代」模式下清空既有資料，在「合併」模式下保留既有資料並回傳成功