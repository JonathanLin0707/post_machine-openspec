## ADDED Requirements

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