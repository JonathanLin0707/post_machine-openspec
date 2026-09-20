## Purpose

Provides the user interface flow for importing database backup JSON files, covering the import button, JSON file selection, import mode selection, and a confirmation step before the import executes.

## ADDED Requirements

### Requirement: 匯入資料庫按鈕與視窗
系統 SHALL 在使用者介面提供「匯入資料庫」按鈕，點擊後開啟匯入視窗，供使用者選擇 JSON 備份檔、選擇匯入模式，並在確認後才執行匯入。

#### Scenario: 開啟匯入視窗
- **WHEN** 使用者點擊「匯入資料庫」按鈕
- **THEN** 系統開啟匯入視窗，顯示 JSON 檔案選擇器與「完整取代」「合併」兩種模式選項

#### Scenario: 取消匯入
- **WHEN** 使用者在匯入視窗點擊「取消」
- **THEN** 視窗關閉，系統不執行匯入

### Requirement: JSON 檔案選擇
系統 SHALL 限制檔案選擇器接受 .json 檔案，並在使用者選擇後讀取檔案內容。

#### Scenario: 選擇有效的 JSON 檔案
- **WHEN** 使用者選擇一個 .json 備份檔
- **THEN** 系統讀取該檔案內容並允許繼續匯入

#### Scenario: 選擇非 JSON 檔案
- **WHEN** 使用者選擇非 .json 檔案
- **THEN** 系統顯示錯誤訊息，不執行匯入

#### Scenario: 未選擇檔案即確認
- **WHEN** 使用者未選擇任何檔案便點擊確認
- **THEN** 系統顯示錯誤訊息，不執行匯入

### Requirement: 匯入執行與結果
系統 SHALL 在使用者確認後依所選模式呼叫匯入 API，並反映匯入結果。

#### Scenario: 匯入成功
- **WHEN** 匯入 API 回傳成功
- **THEN** 系統關閉視窗並顯示成功訊息

#### Scenario: 匯入失敗
- **WHEN** 匯入 API 回傳失敗
- **THEN** 系統顯示錯誤訊息並保留視窗，供使用者修正後重試