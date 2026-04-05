# Changelog

本專案遵循 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/) 格式，版本號採 [Semantic Versioning](https://semver.org/lang/zh-TW/)。

---

## [Unreleased]

### 新增

- **靜態頁面**：創作者招募（`/for-creators.html`）、透明度中心（`/transparency.html`）、隱私權政策（`/privacy.html`）、使用條款（`/terms.html`）
- **透明度 API**：`GET /api/transparency/summary` — 公開唯讀端點，回傳上架工具數、待審工具數、待處理檢舉數、累計違規數
- **本週上新**：`GET /api/tools` 新增 `since_days` 查詢參數（1–90）；前端排序列新增「本週上新」按鈕
- **工具深層連結**：支援 `?tool=<id>` URL，自動捲動並高亮對應卡片
- **分享/複製連結**：卡片新增分享按鈕（優先 `navigator.share`，否則複製連結）；工作室「我的工具」新增「複製連結」
- **追蹤創作者新工具標記**：追蹤的創作者若有 7 天內的新工具，卡片顯示「新」badge
- **差異化 Hero 文案**：首頁副標改為「審核後上架 · 可檢舉與處置 · 創作者帳號與數據」
- **Open Graph / Twitter Card**：主站 `<head>` 加入 OG 與 Twitter meta 標籤
- **Cookie 同意條幅**：首次造訪顯示必要 Cookie 說明，localStorage 記錄已關閉
- **Footer 重整**：拆分為社群準則、透明度中心、隱私權政策、使用條款、創作者招募五個連結
- **創作者帳號系統**：Email + 密碼註冊/登入，JWT httpOnly cookie 驗證，`bcryptjs` 密碼雜湊
- **帳號綁定工具**：`POST /api/tools` 需登入，工具自動綁定 `owner_user_id`；`PUT`/`DELETE` 檢查擁有權（相容舊版 edit_token）
- **我的工具**：`GET /api/tools/me` 列出登入者的所有工具（含 pending），供工作室管理
- **我的統計**：`GET /api/creators/me` 依 `owner_user_id` 聚合創作者統計
- **前端登入/註冊 UI**：Header 登入/註冊按鈕、Auth Modal、提交工具與工作室分頁的登入門檻
- **登入/註冊限流**：每 15 分鐘 15 次/IP，防止撞庫

### Breaking Changes

- **匿名投稿已關閉**：`POST /api/tools` 不再接受未登入的請求（回傳 401）。舊版透過 `creator_name` body 欄位投稿的方式已移除。
- **`users` 表**：新增 `users` 資料表；`tools` 新增 `owner_user_id` 可空欄位
- **環境變數**：生產環境必須設定 `JWT_SECRET`

### 新增（先前）

- **點數系統**：使用者初始 100 點（localStorage），付費工具需扣點；餘額顯示於 header
- **創作者歸屬**：每個工具關聯 `creator_name`，卡片上顯示 "by XXX"，支援依創作者篩選
- **創作者收益查詢**：`GET /api/creators/stats?name=`，前端查詢面板顯示使用量與累積收益
- **精選推薦**：首頁頂部 Featured 區塊，透過 `is_featured` 欄位標記（僅限後端設定）
- **熱門排序**：`sort=trending`，基於近 7 天使用量 + 評分加權
- **使用記錄 API**：`POST /api/tools/:id/use`，記錄 `usage_log` 並遞增 `usage_count` / `points_earned`
- **DB migration**：idempotent `ALTER TABLE` 為 `tools` 表新增 `creator_name`, `cost`, `usage_count`, `points_earned`, `is_featured` 欄位；新增 `usage_log` 表
- **UI**：費用 chip、使用次數、付費按鈕（金色）與免費按鈕（綠色）、header 點數 pill

### 改善

- **熱門排序 SQL**：將重複的 correlated subquery 改為單次聚合 `LEFT JOIN`，降低 `usage_log` 掃描量
- **`/use` 交易安全**：`POST /api/tools/:id/use` 的 `INSERT usage_log` + `UPDATE tools` 包進 `BEGIN IMMEDIATE` / `COMMIT` / `ROLLBACK`
- **`usage_log` 索引**：新增 `idx_usage_log_tool_time(tool_id, created_at)` 加速熱門排序與統計
- **雙入口釐清**：根目錄 `index.html` 精簡為 GitHub Pages 佔位頁；README / AGENTS 明確標注 `public/` 為唯一正式 UI
- **API 限流**：`POST /api/*` 加上 `express-rate-limit`（每 15 分鐘 60 次/IP），防止基本濫用
- **資安強化**：`helmet` 安全標頭；`production` 下 `trust proxy` 與限流 IP 正確；`sendServerError` 隱藏生產環境 500 細節；`sort` 白名單、`tag` LIKE 逸出、創作者查詢長度上限
- **`GET /api/health`**：供監控／Render health check，不查 DB、不計入 GET 限流
- **GET API 限流**：`GET /api/*`（health 除外）每 15 分鐘 400 次／IP

---

## [1.0.0] - 2026-04-05

### 新增

- **後端**：Node.js + Express 伺服器（`server/index.js`）
- **資料庫**：SQLite 持久化儲存（`server/db.js`），使用 `sqlite` + `sqlite3` 套件
- **REST API**：
  - `GET /api/tools` — 支援 `sort`（newest / top）與 `tag` 篩選
  - `POST /api/tools` — 新增工具，含 URL 格式驗證
  - `POST /api/ratings/:toolId` — 1–5 星評分
  - `GET /api/comments/:toolId` — 取得留言列表
  - `POST /api/comments/:toolId` — 新增留言
- **評分系統**：星等評分 UI、即時更新平均分，透過 `localStorage` 防止 session 內重複評分
- **留言系統**：可展開的留言面板、Enter 快速送出、相對時間顯示
- **排序**：最新 / 評分最高
- **標籤篩選**：動態標籤 chip，點擊即篩選
- **iframe 預覽 Modal**：嵌入預覽 + 偵測失敗時顯示 fallback 按鈕
- **前端拆分**：HTML / CSS / JS 分離至 `public/` 目錄
- **部署設定**：`render.yaml` 支援 Render.com 一鍵部署

### 變更

- 前端從單一 `index.html` 重構為 `public/` 下的三個獨立檔案
- 狀態管理從 in-memory JS 陣列改為 API fetch 呼叫
- 移除舊的 `upvote` 機制，改為 1–5 星評分系統

---

## [0.1.0] - 2026-04-05

### 新增

- 單一 `index.html` 靜態應用（純 HTML + CSS + JS，無後端）
- 工具列表（卡片式呈現）與即時搜尋
- 基本表單：提交新工具（名稱、描述、網址、標籤、語言）
- 上投票 (upvote) 系統（in-memory，重整後重置）
- 5 筆範例工具（亞洲市場相關）
- 繁體中文介面，加入 PingFang TC / Microsoft JhengHei 字體
- 部署至 GitHub Pages
- `render.yaml`、`README`、`CONTRIBUTING`、`SECURITY`、`AGENTS`、`CHANGELOG` 等專案文件

---

[Unreleased]: https://github.com/jerry200176-png/vibe-app-store/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/jerry200176-png/vibe-app-store/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/jerry200176-png/vibe-app-store/releases/tag/v0.1.0
