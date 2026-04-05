# Changelog

本專案遵循 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/) 格式，版本號採 [Semantic Versioning](https://semver.org/lang/zh-TW/)。

**維護習慣：** 每次可發布變更從 `[Unreleased]` 移入新版本區塊（訂版號、寫日期），`[Unreleased]` 僅保留進行中項目，避免無限堆疊。

---

## [Unreleased]

（尚無 — 下一批變更先寫在此，發版時再移到新版本標題下。）

---

## [2.0.1] - 2026-04-05

### Changed

- **CHANGELOG**：依語意化版本整理為 0.1.0 → 1.0.0 → 1.1.0 → 2.0.0 分段，避免 `[Unreleased]` 長期堆疊；檔首補維護說明；更新底部 compare 連結。
- **`package.json`**：`version` 由 `1.0.0` 調整為 `2.0.0`，與目前產品與 CHANGELOG 一致。
- **協作文件**：`docs/AI_SOP.md`、`CONTRIBUTING.md` 補充「發版時從 Unreleased 收斂至新版本」的流程。

---

## [2.0.0] - 2026-04-05

### Breaking Changes

- **匿名投稿已關閉**：`POST /api/tools` 須登入（未登入回傳 401）；不再接受 body 內 `creator_name` 偽造。
- **資料庫**：新增 `users` 表；`tools` 新增可空 `owner_user_id`。
- **環境變數**：生產環境須設定 `JWT_SECRET`。

### Added

- **創作者帳號**：Email + 密碼註冊／登入，JWT httpOnly cookie、`bcryptjs` 雜湊；Header Auth UI、提交／工作室登入門檻。
- **帳號與工具**：`POST /api/tools` 綁定 `owner_user_id`；`PUT`/`DELETE` 驗證擁有權（相容舊 `x-edit-token`）；`GET /api/tools/me`、`GET /api/creators/me`。
- **審核與安全**：工具 `pending`/`active`/`removed`；檢舉 API、管理員 API（`ADMIN_KEY`）、違規 Strike、後台 `admin.html`（外掛 JS/CSS 符合 CSP）。
- **靜態與合規**：`/for-creators.html`、`/transparency.html`、`/privacy.html`、`/terms.html`；Cookie 同意條幅。
- **API**：`GET /api/transparency/summary`、`GET /api/feed.xml`（RSS）、`GET /api/site/contact`（`SITE_CONTACT_EMAIL`）；`GET /api/tools?since_days=`；`site-contact.js` 注入聯絡信箱。
- **前端體驗**：本週上新、`?tool=<id>` 深連結、分享／複製連結、追蹤創作者「新」badge、首頁信任列、OG/Twitter meta、Footer 含 RSS。
- **限流**：登入／註冊端點額外嚴格限流。
- **開發與文件**：`docs/AI_SOP.md`、`docs/DECISIONS.md`、`docs/README.md`、`CLAUDE.md`、`.cursor/rules/vibe-app-store.mdc`；預設任務收尾 `commit`+`push` 寫入 SOP／CONTRIBUTING／AGENTS。
- **CI**：`scripts/smoke.js`、`npm test`、`.github/workflows/ci.yml`（Node 18／20）；`server/index.js` 匯出 `Server` Promise 供 smoke 使用。
- **SECURITY.md**：Claude Code／`.claude` 勿提交等說明。

### Changed

- **Render**：`render.yaml` 預設不含 Persistent Disk，對齊免費 Web Service；持久化改儀表板選配 Disk + `DB_PATH`（見 README）。

### Fixed

- **DB 初始化**：`idx_tools_owner` 改於 `owner_user_id` 欄位存在後再建立，避免全新庫啟動失敗。

---

## [1.1.0] - 2026-04-05

### Added

- **點數**：localStorage 初始 100 點，付費工具扣點；Header 顯示餘額。
- **創作者與精選**：`creator_name`、依創作者篩選、`GET /api/creators/stats`；`is_featured` 與首頁 Featured 區。
- **熱門與使用**：`sort=trending`（近 7 日使用 + 評分）；`POST /api/tools/:id/use` 與 `usage_log`。
- **資料庫**：`tools` 擴充欄位與 `usage_log` 表（idempotent `ALTER`）。

### Changed

- **UI**：費用 chip、使用次數、付費／免費試用按鈕樣式。
- **熱門排序 SQL**：correlated subquery 改為單次 `LEFT JOIN` 聚合。
- **`/use` 交易**：`BEGIN IMMEDIATE`／`COMMIT`／`ROLLBACK` 包住寫入。
- **索引**：`idx_usage_log_tool_time(tool_id, created_at)`。
- **雙入口**：根目錄 `index.html` 僅 GitHub Pages 佔位；正式 UI 僅 `public/`。
- **限流與資安**：`POST /api/*` 限流；`helmet`、`trust proxy`（prod）、`sendServerError`；`sort` 白名單、`tag` LIKE 逸出、創作者查詢長度上限。
- **`GET /api/health`**：監控用，不計入 GET 限流。
- **GET 限流**：`GET /api/*`（health 除外）每 15 分鐘 400 次／IP。

---

## [1.0.0] - 2026-04-05

### Added

- **後端**：Node.js + Express（`server/index.js`）。
- **資料庫**：SQLite（`server/db.js`），`sqlite` + `sqlite3`。
- **REST API**：`GET/POST /api/tools`、`POST /api/ratings/:toolId`、`GET/POST /api/comments/:toolId`（含 URL 驗證）。
- **前端**：評分、留言、排序、標籤、iframe 預覽；`public/` 拆分 HTML／CSS／JS。
- **部署**：`render.yaml`（Render 一鍵部署）。

### Changed

- 狀態改為以 API fetch 為主；移除舊 upvote，改 1–5 星評分。

---

## [0.1.0] - 2026-04-05

### Added

- 單一 `index.html` 靜態原型（無後端）、搜尋、提交表單、upvote、範例工具、繁中 UI、GitHub Pages。
- 初始專案文件（`README`、`CONTRIBUTING`、`SECURITY`、`AGENTS` 等）。

---

[Unreleased]: https://github.com/jerry200176-png/vibe-app-store/compare/v2.0.1...HEAD
[2.0.1]: https://github.com/jerry200176-png/vibe-app-store/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/jerry200176-png/vibe-app-store/compare/v1.1.0...v2.0.0
[1.1.0]: https://github.com/jerry200176-png/vibe-app-store/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/jerry200176-png/vibe-app-store/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/jerry200176-png/vibe-app-store/releases/tag/v0.1.0
