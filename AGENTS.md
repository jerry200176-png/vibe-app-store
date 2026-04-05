# AGENTS.md — 給 AI 代理的專案說明

本文件幫助 AI 代理（Claude、Copilot 等）快速理解專案架構、慣例與注意事項，避免產生與現有程式碼衝突的建議。人類維護者同樣可以參考。

**開始任務前請先讀：** [`docs/AI_SOP.md`](docs/AI_SOP.md)（產品意圖與工作流程）→ 本檔（技術細節）→ [`docs/DECISIONS.md`](docs/DECISIONS.md)（已定案決策）。**Cursor**：`.cursor/rules/vibe-app-store.mdc`。**Claude Code**：根目錄 [`CLAUDE.md`](CLAUDE.md)。

---

## 產品不變量（違反前須與維護者確認）

| 不變量 | 說明 |
|--------|------|
| 審核上架 | 新工具 `status = pending`；`GET /api/tools` **僅**回傳 `active`。 |
| 創作者帳號 | `POST /api/tools` 必須登入；`creator_name` 後端取自使用者，不可信任 body 偽造。 |
| 訪客能力 | 未登入可瀏覽、評分、留言；評分防重複僅 localStorage（刻意取捨）。 |
| 信任與合規 | 檢舉、Strike、透明度頁、`/privacy.html`、`/terms.html` 為產品敘事一環，勿無故移除。 |
| 正式 UI | 僅 `public/`；根目錄 `index.html` 僅 GitHub Pages 佔位。 |
| 管理後台 | `/api/admin/*` 需 `ADMIN_KEY`；審核與違規置由此進行。 |

---

## 專案概覽

**Vibe App Store** — 亞洲社群的 AI 工具目錄。

使用者可以瀏覽、搜尋工具，並給予 1–5 星評分與留言（**不需帳號**）。**投稿與管理自己的工具**需 Email+密碼註冊；新投稿為 **pending**，經管理員審核後才會以 **active** 出現在公開列表。後端以 SQLite 持久化資料。

---

## 技術事實（以此為準，不要依賴訓練記憶）

### 執行入口

```
npm run dev   → node --watch server/index.js
npm start     → node server/index.js
npm test      → node scripts/smoke.js（CI smoke — 暫存 DB、啟動 server、驗證 /api/health 與 /api/tools）
```

預設埠：`3000`（可透過 `PORT` 環境變數覆寫）

### 後端架構

```
server/
├── index.js          Express 入口；helmet、cookie-parser、trust proxy(prod)、限流、掛載路由
├── db.js             SQLite 初始化（sqlite + sqlite3 套件，async API）
├── middleware/
│   └── auth.js       JWT 驗證：signToken、requireUser、optionalUser、cookie 設定
├── util/
│   └── httpError.js  sendServerError(res, err) — 生產環境不洩漏 e.message
└── routes/
    ├── auth.js       POST register/login/logout, GET me — 帳號系統
    ├── tools.js      GET /api/tools, POST（需登入）, PUT/DELETE（擁有權）, GET /api/tools/me
    ├── ratings.js    POST /api/ratings/:toolId
    ├── comments.js   GET/POST /api/comments/:toolId
    ├── creators.js   GET /api/creators/stats, GET /api/creators/me（需登入）
    ├── reports.js       POST /api/reports
    ├── admin.js         管理員 API（需 ADMIN_KEY）
    ├── transparency.js  GET /api/transparency/summary（公開唯讀）
    ├── feed.js          GET /api/feed.xml（RSS 2.0，最近上架工具）
    └── site.js          GET /api/site/contact（SITE_CONTACT_EMAIL，公開唯讀）
```

**重要：** 使用的是 `sqlite` + `sqlite3`（async/await API），**不是** `better-sqlite3`（sync API）。修改 DB 相關程式碼時請使用 `await db.all()` / `await db.get()` / `await db.run()` 形式。

**安全：** 新增路由時，`catch` 區塊請呼叫 `sendServerError(res, e)`，勿直接回傳 `e.message`。`GET /api/tools` 的 `sort` 已白名單化；`tag` 篩選使用 `LIKE ... ESCAPE` 與逸出字元。

### 資料庫

- 路徑：`data/appstore.db`（由 `DB_PATH` 環境變數覆寫）
- 由 `server/db.js` 的 `getDb()` 函式懶初始化，回傳 Promise
- Schema：

```sql
users     (id, email UNIQUE, password_hash, display_name, created_at)
tools     (id, title, desc, url, tags TEXT/JSON, lang, creator_name, cost, usage_count, points_earned, is_featured, status, owner_user_id → users.id, edit_token_hash, reviewed_at, created_at)
ratings   (id, tool_id → tools.id, stars 1-5, created_at)
comments  (id, tool_id → tools.id, body, created_at)
usage_log (id, tool_id → tools.id, created_at)
reports   (id, target_type, target_id, reason, detail, status, created_at)
violations(id, creator_name, tool_id, report_id, reason, created_at)
```

- `cost`: 0 = 免費, 1–100 = 付費（虛擬點數）
- `usage_count` / `points_earned`: 由 `POST /api/tools/:id/use` 遞增
- `is_featured`: 0/1, 由後端 seed 或 SQL 設定（API 不接受前端寫入）
- `usage_log`: 每次使用一筆記錄，用於 trending 排序（近 7 日使用量）

- `tags` 欄位儲存為 JSON 字串（`'["ai","生產力"]'`），讀出後需 `JSON.parse()`
- `created_at` 為 Unix timestamp（`unixepoch()` 格式）
- `data/*.db` 已加入 `.gitignore`，**絕對不要提交含使用者資料的 .db 檔案**

### 前端架構

```
public/
├── index.html           殼層 HTML，引用 /style.css 與 /app.js
├── style.css            所有樣式（深色主題，CSS 變數定義在 :root）
├── app.js               所有前端邏輯（fetch API、事件委派、localStorage）
├── for-creators.html    創作者招募落地頁（純靜態）
├── transparency.html    透明度中心（fetch /api/transparency/summary 顯示營運數據）
├── privacy.html         隱私權政策（純靜態）
├── terms.html           使用條款（純靜態）
├── admin.html           管理員後台
├── admin.js             管理員前端邏輯
├── admin-style.css      管理員樣式
└── site-contact.js      法務頁共用腳本（fetch /api/site/contact → 填入信箱）
```

**注意：** 根目錄的 `index.html` **僅為 GitHub Pages 佔位頁**（一段重導說明文字，不含任何應用邏輯）。**正式 UI 唯一來源是 `public/`**。永遠不要在根目錄 `index.html` 加入功能程式碼。

### 前端關鍵慣例

- **狀態**：`allTools` + `activeTag`、`activeSort`、`activeCreator`、`searchQuery`、**`sinceDays`**（本週上新）、`currentUser`（登入狀態）
- **點數**：`localStorage` 的 `vibe_points`（預設 100），由 `getPoints()` / `setPoints()` 管理
- **渲染**：`renderAll()` 每次過濾/排序後重新渲染各 grid
- **事件委派**：卡片互動（評分、留言、追蹤、試用、檢舉、分享等）掛在 **`#tool-grid`、`#featured-grid`、`#followed-grid`**（見 `attachGridEvents`）；改卡片 UI 時三處行為需一致
- **深層連結**：`?tool=<id>` 於 `loadTools` 完成後捲動並高亮對應卡片
- **XSS 防護**：動態插入 HTML 必須通過 `esc()`
- **評分防重複**：`localStorage` 的 `rated_tools`、`my_stars`（訪客可繞過，見 `SECURITY.md`）
- **API 呼叫**：`apiFetch` 已設 **`credentials: 'include'`**，以傳送 JWT cookie

---

## API 摘要

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/auth/register` | 註冊（email, password, display_name），設定 JWT cookie |
| POST | `/api/auth/login` | 登入，設定 JWT cookie |
| POST | `/api/auth/logout` | 清除 cookie |
| GET | `/api/auth/me` | 目前使用者資訊（需登入） |
| GET | `/api/tools?sort=newest\|top\|trending&tag=&creator=&since_days=` | 工具列表（僅 status=active） |
| POST | `/api/tools` | 新增工具（需登入，自動綁定 owner_user_id） |
| PUT | `/api/tools/:id` | 更新工具（需為 owner 或持有 edit_token） |
| DELETE | `/api/tools/:id` | 刪除工具（同上） |
| GET | `/api/tools/me` | 我的工具列表（需登入） |
| POST | `/api/tools/:id/use` | 記錄使用事件 |
| POST | `/api/ratings/:toolId` | 評分 `{ stars: 1-5 }` |
| GET | `/api/comments/:toolId` | 留言列表 |
| POST | `/api/comments/:toolId` | 新增留言 `{ body }` |
| GET | `/api/creators/stats?name=` | 公開創作者統計 |
| GET | `/api/creators/me` | 我的創作者統計（需登入） |
| GET | `/api/transparency/summary` | 平台營運概況（公開唯讀） |
| GET | `/api/feed.xml` | RSS 2.0 feed — 最近 30 筆上架工具（`application/rss+xml`） |
| GET | `/api/site/contact` | 聯絡信箱（env `SITE_CONTACT_EMAIL`，未設定則回傳 `null`） |

所有 API 回應為 JSON（`/api/feed.xml` 除外，回傳 XML）；錯誤回應格式 `{ "error": "說明" }`。

---

## 修改注意事項

### 新增 API 端點

1. 在 `server/routes/` 建立新檔案或加入現有檔案
2. 在 `server/index.js` 掛載路由：`app.use('/api/xxx', require('./routes/xxx'))`
3. 驗證所有使用者輸入（長度、格式、型別）
4. 更新 `README.md` 的 API 文件

### 修改 Schema

1. 更新 `server/db.js` 的 `CREATE TABLE IF NOT EXISTS` 陳述式
2. **注意：** `IF NOT EXISTS` 不會自動遷移現有資料庫，需要手動 migration 或刪除舊 db
3. 更新 `README.md` 與 `CHANGELOG.md`

### 修改前端 UI

1. 修改 `public/style.css`（樣式）或 `public/app.js`（邏輯）
2. 若新增卡片內元素，確保事件委派邏輯也一起更新
3. 新的動態文字一律套用 `esc()`

### 任務收尾與 GitHub（AI 代理預設）

完成可交付變更後，若使用者未要求「不要提交／不要 push」，應主動 **commit + push** 至 `origin` 目前分支；勿加入 `.env`、`.claude/`、`data/*.db`。完整步驟與例外見 **`docs/AI_SOP.md`** 第 3 節。

### 新增相依套件

- 先評估是否真的需要（現有功能盡量用原生 Node.js 或已有的套件）
- 避免需要原生編譯的套件（如 `better-sqlite3` 在 Node 24 + Windows 上有相容性問題）
- 更新 `package.json` 並執行 `npm install`

---

## 不要做的事

- 不要在 `app.js` 裡直接插入未 escape 的字串進 innerHTML
- 不要把 `data/appstore.db` 加入 git commit
- 不要在路由 `catch` 裡把 **`e.message` 或 stack** 直接回傳給客戶端（請用 **`sendServerError(res, e)`**）
- 不要把 `server/db.js` 改成同步 API（會破壞其他路由的 async 流程）
- 不要在 `public/` 引入外部 CDN 資源（維持無外部相依）
- 不要未經討論改寫產品邊界（例如開放匿名投稿、公開列表顯示 pending）

---

## 文件索引

| 檔案 | 用途 |
|------|------|
| `docs/AI_SOP.md` | **AI 工作流程與產品意圖**（與本檔並讀） |
| `docs/DECISIONS.md` | 已定案架構／產品決策（ADR 精簡版） |
| `docs/README.md` | `docs/` 目錄說明 |
| `README.md` | 使用者導向說明、快速開始、API 文件、部署 |
| `CONTRIBUTING.md` | 開發流程、PR 規範、手動測試、程式風格 |
| `SECURITY.md` | 安全漏洞回報、威脅與取捨 |
| `CHANGELOG.md` | 版本變更紀錄 |
| `.github/workflows/ci.yml` | GitHub Actions CI（push/PR 時跑 `npm test`） |
| `scripts/smoke.js` | smoke test：暫存 DB → 啟動 server → 驗證關鍵端點 |
| `AGENTS.md` | 本檔：給 AI 代理的技術脈絡 |
| `.cursor/rules/vibe-app-store.mdc` | Cursor 自動載入的規則 |
| `CLAUDE.md` | Claude Code 自動載入的專案指引（與本檔、`docs/AI_SOP` 對齊） |
