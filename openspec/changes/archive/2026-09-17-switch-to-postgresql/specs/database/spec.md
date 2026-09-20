## MODIFIED Requirements

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

## ADDED Requirements

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