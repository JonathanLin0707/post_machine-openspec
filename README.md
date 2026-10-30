# POS 系統（Point of Sale）

一套適用於雜貨店的收銀系統，提供收銀結帳、商品管理、訂單查詢與銷售報表。

> 技術架構與開發細節見 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)；AI 協作規則見 [AGENTS.md](AGENTS.md)；行為規格見 [openspec/specs/](openspec/specs/)。

## 專案用途

提供小型商店日常營運所需的收銀流程：販售商品、記錄訂單、管理庫存與商品資料，並能查看銷售統計與匯出資料。

## 主要功能

- **收銀**：搜尋或依分類瀏覽商品，加入購物車，輸入折扣金額後確認結帳，付款方式可選現金、信用卡或行動支付。
- **商品管理**：新增、編輯、刪除商品，支援關鍵字搜尋與分類篩選。
- **訂單查詢**：檢視訂單列表，可依訂單編號、商品名稱搜尋，並查看每筆訂單的商品明細。
- **銷售報表**：今日銷售摘要、近 30 天每日銷售圖表、近 12 個月統計，以及熱銷商品排行。
- **資料匯出**：銷售訂單可匯出為 CSV；整體資料可匯出為 JSON 備份，並可從備份匯入（覆蓋或合併）。

## 技術簡介

| 層級 | 技術 |
|------|------|
| 前端 | React 18、React Router、TypeScript、Vite、Tailwind CSS、Zustand、Chart.js |
| 後端 | Node.js、Express、TypeScript、PostgreSQL（`pg`） |
| 共用 | `shared/` 工作區提供前後端共用的型別定義 |
| 部署 | 可部署至 Vercel（前端靜態檔 + Serverless API），資料庫使用外部 PostgreSQL |

## 系統需求

- Node.js **22.x**（專案 `engines` 設定為 `22.x`）
- npm（支援 workspaces）
- PostgreSQL（建議 16，與下方 Docker 範例一致）

## 安裝與啟動

1. 安裝相依套件（於專案根目錄執行）：

   ```bash
   npm install
   ```

2. 建立本地 PostgreSQL（以 Docker 為例，請將 `<your-password>` 換成自訂密碼）：

   ```bash
   docker run --name grocery-pg -e POSTGRES_PASSWORD=<your-password> -p 5432:5432 -d postgres:16
   ```

3. 在 `server/` 目錄建立 `.env`（可參考 `server/.env.example`），填入資料庫連線字串，詳見下方「基本設定」。

4. 同時啟動前端與後端：

   ```bash
   npm run dev
   ```

   啟動後：
   - 前端：<http://localhost:3000>
   - 後端 API：<http://localhost:8080>
   - 健康檢查：<http://localhost:8080/health>（資料庫就緒時回傳 `200`，未就緒時回傳 `503`）

若只需啟動其中一端，可分別執行 `npm run dev --workspace=client` 或 `npm run dev --workspace=server`。

## 基本設定

後端透過環境變數設定，主要欄位如下（實際值請勿提交至版控）：

| 變數 | 必填 | 說明 | 範例格式 |
|------|------|------|------|
| `DATABASE_URL` | 是 | PostgreSQL 連線字串 | `postgresql://<user>:<password>@<host>:<port>/<database>` |
| `PORT` | 否 | 後端埠號，預設 `8080` | `<port>` |
| `NODE_ENV` | 否 | 執行環境 | `development` |
| `PGSSLMODE` | 否 | 設為 `require` 可強制使用 SSL（例如 Neon 等雲端資料庫） | `require` |

## 測試與檢查

```bash
npm run lint                                   # 前後端 Lint（零警告才算通過）
npm run test                                   # 前端測試
npx vitest run server/__tests__                # 後端測試（需可用的 PostgreSQL）
npm run build                                  # 建置所有工作區（會先建置 shared）
```

> 新 clone 的環境若要單獨執行 `lint` 或 `test`，請先執行 `npm run build --workspace=shared`，產生 client / server 依賴的共用型別（`shared/dist`）。

## 部署

本專案可部署為單一 Vercel 專案：前端靜態檔由 CDN 提供，後端 Express 以 Serverless Function 執行。

1. 於 Vercel 匯入此 Git 儲存庫，Root Directory 保持為根目錄。
2. Framework Preset 選擇 **Other**，建置與輸出設定已由 `vercel.json` 決定。
3. 於專案的 Environment Variables 設定 `DATABASE_URL`（外部受管 PostgreSQL，建議使用連線池位址）；非 Supabase 網域的資料庫請另設 `PGSSLMODE=require`。
4. 部署完成後，開啟 `https://<your-domain>/health` 確認服務狀態。

部署細節與注意事項見 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) 第 11 節。

## 既有資料遷移

若需要從舊版 SQLite 資料遷移到 PostgreSQL，請先備份既有 `.db` 檔，再於 PowerShell 設定環境變數並執行遷移腳本（將尖括號內容換成實際值）：

```powershell
$env:SQLITE_PATH="<path-to-sqlite-file>"
$env:DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<database>"
npx tsx server/scripts/migrate-sqlite-to-pg.ts --replace
```

> `--replace` 會先清空目標資料表再匯入，執行前請確認連線的是正確的資料庫。

## 相關文件

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)：技術架構、模組與資料流、設定與測試架構（開發者與 AI Agent 用）
- [docs/architecture.html](docs/architecture.html)：架構圖（HTML 版）
- [AGENTS.md](AGENTS.md)：AI coding 最小規則
- [openspec/specs/](openspec/specs/)：各功能行為規格
