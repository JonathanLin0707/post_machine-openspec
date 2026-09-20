# export-confirmation-dialog Specification

## Purpose

在使用者執行資料庫匯出或銷售報表 CSV 匯出之前顯示確認視窗，提供確認或取消的明確選擇，避免誤觸造成不必要的資料下載。

## ADDED Requirements

### Requirement: System requires confirmation before database export
系統 SHALL 在執行資料庫匯出時，先顯示確認視窗並標示將執行的匯出動作；使用者點擊「確認」才下載資料庫檔案，點擊「取消」則不執行匯出。

#### Scenario: User confirms database export
- **WHEN** 使用者點擊「💾 匯出資料庫」按鈕，確認視窗顯示後點擊「確認」
- **THEN** 系統呼叫 `/database/export` 並下載資料庫檔案

#### Scenario: User cancels database export
- **WHEN** 使用者在資料庫匯出確認視窗中點擊「取消」
- **THEN** 確認視窗關閉，且系統不執行資料庫匯出

### Requirement: System requires confirmation before CSV export
系統 SHALL 在執行銷售報表 CSV 匯出時，先顯示確認視窗並標示將執行的匯出動作；使用者點擊「確認」才呼叫匯出 API 並下載檔案，點擊「取消」則不執行匯出。

#### Scenario: User confirms CSV export
- **WHEN** 使用者點擊「📥 匯出 CSV」按鈕，確認視窗顯示後點擊「確認」
- **THEN** 系統呼叫 `/reports/csv-export` 並下載 CSV 檔案

#### Scenario: User cancels CSV export
- **WHEN** 使用者在 CSV 匯出確認視窗中點擊「取消」
- **THEN** 確認視窗關閉，且系統不執行 CSV 匯出