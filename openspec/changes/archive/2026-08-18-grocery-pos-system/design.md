## Context

雜貨店 POS 系統是一個全新專案，需要建立完整的前後端架構。系統運行在 Web 瀏覽器中，採用本地部署模式。主要用戶為收銀員，需要快速、直觀的操作介面。

技術選型：
- 前端：React 18 + TypeScript + Tailwind CSS
- 後端：Express.js + TypeScript
- 資料庫：SQLite3 (better-sqlite3)
- 部署：本地桌面應用

## Goals / Non-Goals

**Goals:**
- 建立 Monorepo 專案結構，前後端分離
- 實現商品管理、購物車結帳、銷售報表三大核心功能
- 提供收銀台專用 UI（大按鈕、高對比、快速操作）
- 確保系統響應速度：API 回應 < 200ms，頁面載入 < 2s

**Non-Goals:**
- 不實現多店鋪管理功能
- 不實現員工帳號權限系統（一期）
- 不實現雲端部署（一期）
- 不實現行動裝置原生應用
- 不實現 Barcode 掃描器硬體整合

## Decisions

### 1. 專案結構：Monorepo

**選擇：** 使用 npm workspaces 的 Monorepo 結構

**理由：**
- 前後端共享 TypeScript 類型定義
- 統一開發指令與建構流程
- 方便未來擴展微服務

**替代方案：**
- 獨立仓库：增加維護成本，類型同步困難
- Lerna/Turborepo：對小型專案過度工程化

### 2. 狀態管理：Context API + useReducer

**選擇：** 使用 React Context 搭配 useReducer

**理由：**
- 購物車狀態相對簡單，不需要 Redux 的複雜度
- Context API 是 React 原生方案，無額外依賴
- useReducer 提供可預測的狀態更新

**替代方案：**
- Redux Toolkit：增加 bundle size，對此專案過度
- Zustand/Jotai：輕量但需要額外學習成本

### 3. 樣式方案：Tailwind CSS

**選擇：** 使用 Tailwind CSS 進行樣式開發

**理由：**
- 收銀台 UI 需要快速迭代，Tailwind 的 utility-first 模式適合
- 可自訂設計系統，確保大按鈕、高對比的收銀台風格
- 無運行時開銷，效能優異

**替代方案：**
- CSS Modules：開發速度較慢
- Styled Components：運行時開銷，SSR 不需要

### 4. 資料庫：SQLite3

**選擇：** 使用 better-sqlite3 作為 SQLite 驅動

**理由：**
- 本地部署，無需額外資料庫服務
- better-sqlite3 是同步 API，適合 Node.js 場景
- 輕量高效，單檔儲存便於備份

**替代方案：**
- PostgreSQL/MySQL：需要額外服務，增加部署複雜度
- SQLite (sql.js)：效能較差，WASM 執行

### 5. API 設計：RESTful

**選擇：** RESTful API 設計

**理由：**
- 業務邏輯簡單，CRUD 為主
- REST 是業界標準，易於理解和維護
- 與前端 React 的資料獲取模式契合

**替代方案：**
- GraphQL：對此專案過度靈活
- tRPC：需要更緊密的前後端耦合

### 6. 後端框架：Express.js

**選擇：** 使用 Express.js 作為後端框架

**理由：**
- 載入量大，社群資源豐富
- 學習曲線平緩，開發速度快
- 中間件生態完善

**替代方案：**
- Fastify：效能更好但生態較小
- NestJS：企業級框架，對小型專案過度

## Risks / Trade-offs

### 風險 1：SQLite 併發限制
**風險：** SQLite 在高併發寫入時可能有鎖定問題
**緩解：** 本專案為單店鋪使用，併發量低；可升級為 PostgreSQL 若需多店鋪

### 風險 2：前端 Bundle Size
**風險：** React + Tailwind 可能導致較大的 JavaScript 檔案
**緩解：** 使用 Code Splitting、路由懶載入、Tree Shaking

### 風險 3：資料備份
**風險：** SQLite 單檔儲存，若檔案損壞可能丢失資料
**緩解：** 實現自動備份功能，提供手動匯出/匯入

### 風險 4：安全性
**風險：** 本地部署可能缺乏 HTTPS、認證等安全措施
**緩解：** 一期為本地信任環境；二期可加入基礎認證

### 權衡：開發速度 vs 系統複雜度
**選擇：** 優先開發速度
**理由：** 一期目標是快速驗證核心功能，選擇成熟穩定的技術棧

## Migration Plan

### 部署步驟

1. **環境準備**
   - 安裝 Node.js 18+
   - 安裝 npm 9+

2. **安裝依賴**
   ```bash
   npm run install:all
   ```

3. **初始化資料庫**
   ```bash
   npm run db:init
   ```

4. **啟動開發伺服器**
   ```bash
   npm run dev
   ```

5. **建構生產版本**
   ```bash
   npm run build
   ```

6. **啟動生產伺服器**
   ```bash
   npm start
   ```

### 回滾策略

- 保留 SQLite 資料庫檔案備份
- 使用 Git 標記穩定版本
- 若建構失敗，回退到上一個穩定版本

## Open Questions

（無）
