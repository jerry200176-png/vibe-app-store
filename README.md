# ⚡ Vibe App Store

> 探索、評分與討論由 **AI 協作打造**的小工具 — 亞洲社群的開放目錄。創作者以 Email 註冊帳號後即可投稿工具。

**線上網址（完整版）：** https://vibe-app-store.onrender.com  
**GitHub Pages（靜態預覽）：** [jerry200176-png.github.io/vibe-app-store](https://jerry200176-png.github.io/vibe-app-store/)

---

## 目錄

- [專案簡介](#專案簡介)
- [功能一覽](#功能一覽)
- [技術棧](#技術棧)
- [目錄結構](#目錄結構)
- [快速開始](#快速開始)
- [環境變數](#環境變數)
- [API 文件](#api-文件)
- [部署](#部署)
- [專案文件與 AI 協作](#專案文件與-ai-協作)
- [常見問題](#常見問題)
- [貢獻](#貢獻)

---

## 專案簡介

Vibe App Store 是一個**社群驅動的 AI 工具目錄**，專為亞洲用戶設計。

在 AI 工具爆炸的時代，很多人用 vibe coding 做出了有趣的小工具，但它們散落在各處，難以被發現。這個平台讓任何人都能：

- 在幾秒內瀏覽與試用 AI 工具
- 提交自己的作品（只需填 3 個欄位）
- 留下評分與留言，讓好工具被看見

**與 GitHub 的差異：** GitHub 是給工程師看程式碼的地方，Vibe App Store 是給所有人直接試用工具的地方。零技術門檻、中文優先、一鍵試用。

---

## 功能一覽

| 功能 | 說明 |
|------|------|
| 🔍 瀏覽與搜尋 | 即時搜尋工具名稱、描述、標籤、創作者 |
| 🏷 標籤篩選 | 點擊標籤 chip 篩選，支援多種分類 |
| 👤 創作者篩選 | 下拉選單依創作者過濾工具列表 |
| 📊 排序 | 依「最新」、「評分最高」或「熱門」排序 |
| ⭐ 評分 | 1–5 星評分，顯示平均分與評分人數 |
| 💬 留言 | 每個工具獨立留言區，即時顯示 |
| 🖼 預覽 | iframe 嵌入預覽，不支援時顯示直接開啟按鈕 |
| ➕ 提交工具 | 需先註冊／登入；填寫名稱、描述、網址、費用、標籤、語言（創作者名稱為帳號顯示名稱）；送出後 **審核中** 直至管理員核准 |
| 🌐 語言標籤 | 標示工具支援語言（中文 / 英文 / 多語言 / 日文 / 韓文） |
| 💰 點數系統 | 使用者初始 100 點（localStorage），付費工具需扣點才能使用 |
| ⭐ 精選推薦 | 首頁頂部顯示精選工具（is_featured 欄位） |
| 📈 創作者收益 | 查詢創作者工具使用次數與累積收益點數 |
| 🔥 熱門排序 | 根據近 7 天使用量與評分綜合排名 |

---

## 技術棧

| 層級 | 技術 |
|------|------|
| 後端 | [Node.js 18+](https://nodejs.org/) + [Express 4](https://expressjs.com/) |
| 資料庫 | [SQLite](https://www.sqlite.org/)（透過 [sqlite](https://github.com/kriasoft/node-sqlite) + [sqlite3](https://github.com/TryGhost/node-sqlite3)） |
| 前端 | 純 HTML + CSS + JavaScript（無框架，由 Express 提供靜態檔） |
| 部署 | [Render.com](https://render.com)（含 `render.yaml` 設定） |

> **主應用（SPA）** 核心為三個檔案：`public/index.html`、`public/style.css`、`public/app.js`，無需建置。  
> 另有多個**純靜態頁**（招募、透明度、隱私、條款）與 **Admin 後台**（`admin.html` + `admin.js` + `admin-style.css`）。  
> **注意：** 根目錄的 `index.html` 僅為 GitHub Pages 佔位頁。正式 UI 與 API 的來源是 `public/` + Express。

---

## 目錄結構

```
vibe-app-store/
├── server/
│   ├── index.js          # Express 入口、Helmet、限流、路由掛載、靜態檔
│   ├── db.js             # SQLite、schema、migration、種子資料
│   ├── middleware/       # auth.js（JWT cookie）
│   ├── util/
│   └── routes/           # auth, tools, ratings, comments, creators,
│                         # reports, admin, transparency
├── public/
│   ├── index.html        # 主站殼層
│   ├── style.css
│   ├── app.js
│   ├── for-creators.html / transparency.html / privacy.html / terms.html
│   ├── admin.html, admin.js, admin-style.css
├── docs/
│   ├── README.md         # 文件索引
│   ├── AI_SOP.md         # 給 AI 的標準作業程序（產品意圖 + 流程）
│   └── DECISIONS.md      # 已定案決策（ADR 精簡版）
├── .cursor/rules/        # Cursor 自動載入的專案規則（指向上述文件）
├── data/                 # 執行時 appstore.db（gitignore）
├── index.html            # GitHub Pages 佔位頁（非正式 UI）
├── AGENTS.md             # 給 AI 的技術脈絡（與 docs/AI_SOP 並讀）
├── CLAUDE.md             # Claude Code 自動載入的專案指引
├── package.json
├── render.yaml
└── README.md
```

---

## 快速開始

### 系統需求

- **Node.js 18 以上**（建議使用 LTS 版本）
- npm（隨 Node.js 附帶）

### 本地執行

```bash
# 1. 複製專案
git clone https://github.com/jerry200176-png/vibe-app-store.git
cd vibe-app-store

# 2. 安裝相依套件
npm install

# 3. 啟動開發伺服器（有檔案變更時自動重啟）
npm run dev
```

瀏覽器開啟 **http://localhost:3000**

首次啟動會自動建立 `data/appstore.db` 並載入 5 筆範例工具。

### 其他指令

```bash
npm start      # 正式模式（無 watch）
```

---

## 環境變數

| 變數 | 預設值 | 說明 |
|------|--------|------|
| `PORT` | `3000` | HTTP 監聽埠 |
| `DB_PATH` | `data/appstore.db` | SQLite 資料庫檔案路徑（相對於專案根目錄） |
| `NODE_ENV` | 未設定 | 設為 `production` 時：啟用 `trust proxy`（反向代理後限流才對「真實客戶 IP」生效）、隱藏 500 錯誤細節、cookie 設為 Secure |
| `JWT_SECRET` | `dev-secret-change-in-production` | JWT 簽發密鑰，**生產環境必須設定為隨機字串** |
| `ADMIN_KEY` | 未設定 | 管理員 API 認證密鑰 |
| `SITE_CONTACT_EMAIL` | 未設定 | 隱私權政策與使用條款頁顯示的聯絡信箱；`render.yaml` 已佔位（`sync: false`），需自行在 Render 儀表板填入 |

可建立 `.env` 檔案（已在 `.gitignore` 中）或直接於 Render 的環境變數設定。`render.yaml` 已設定 `JWT_SECRET` 和 `ADMIN_KEY` 為自動產生。

### 安全性（精簡）

- **Helmet**：基本 HTTP 安全標頭；CSP 允許同源腳本／樣式，以及以 iframe 預覽外部工具（`http:` / `https:`）。
- **500 錯誤**：生產環境僅回傳泛用訊息，不將資料庫或堆疊細節回傳給客戶端（詳見 `server/util/httpError.js`）。
- **`GET /api/tools`**：`sort` 僅接受 `newest`、`top`、`trending`；`tag` 的 `LIKE` 已逸出 `%`、`_`、`\`，並使用 `ESCAPE`。
- **`creator` / 創作者查詢**：參數長度上限 100 字元。
- **GET 限流**：`GET /api/*`（不含下述 health）每 IP 每 15 分鐘 400 次，減輕列表被掃描／刷爆；一般瀏覽與篩選通常遠低於此。

---

## API 文件

基底路徑：`/api`，所有請求與回應均為 JSON。

### 健康檢查

#### `GET /api/health`

回傳 `{ "ok": true }`，不查資料庫、**不計入** GET 限流，供 Render / 監控探針使用。回應標頭含 `Cache-Control: no-store`。

### 工具

#### `GET /api/tools`

列出所有工具（含聚合評分與留言數）。

**Query 參數：**

| 參數 | 可選值 | 預設 | 說明 |
|------|--------|------|------|
| `sort` | `newest` \| `top` \| `trending` | `newest` | 排序方式 |
| `tag` | 任意字串 | — | 依標籤篩選 |
| `creator` | 任意字串 | — | 依創作者名稱篩選（不分大小寫） |
| `since_days` | `1`–`90` | — | 僅回傳最近 N 天內建立的工具 |

**回應範例：**

```json
[
  {
    "id": 1,
    "title": "履歷健診 AI",
    "desc": "貼上你的履歷，立即獲得犀利的 AI 改善建議。",
    "url": "https://example.com",
    "tags": ["求職", "ai"],
    "lang": "中文",
    "creator_name": "Alice",
    "cost": 10,
    "usage_count": 42,
    "points_earned": 420,
    "is_featured": true,
    "created_at": 1712345678,
    "avg_rating": 4.5,
    "rating_count": 12,
    "comment_count": 3
  }
]
```

#### `POST /api/tools`（需登入）

新增工具。需要帶有效的 JWT cookie（透過 `/api/auth/login` 或 `/api/auth/register` 取得）。工具的 `creator_name` 自動設為登入使用者的 `display_name`，`owner_user_id` 自動綁定。新工具狀態為 `pending`，需管理員審核通過才會公開。

**Request body：**

```json
{
  "title": "工具名稱",
  "desc": "工具描述",
  "url": "https://your-tool.example.com",
  "cost": 10,
  "tags": ["ai", "生產力"],
  "lang": "中文"
}
```

驗證規則：`title`、`desc`、`url` 為必填；`url` 必須是 `http://` 或 `https://` 開頭；`cost` 為 0–100 整數（0 = 免費）；`tags` 最多 5 個；`desc` 最多 300 字元。

#### `PUT /api/tools/:id`（需登入或 edit_token）

更新工具。需為工具擁有者（`owner_user_id` 匹配）或持有舊版 `x-edit-token` 標頭。

#### `DELETE /api/tools/:id`（需登入或 edit_token）

刪除工具（軟刪除，設為 `removed` 狀態）。權限邏輯同 PUT。

#### `GET /api/tools/me`（需登入）

列出登入使用者的所有工具（含 `pending`），供創作者工作室使用。

#### `POST /api/tools/:id/use`

記錄一次工具使用事件。若工具有費用，同時累加 `usage_count` 與 `points_earned`。

**回應：** `{ "usage_count": 43, "points_earned": 430, "cost": 10 }`

---

### 認證

#### `POST /api/auth/register`

註冊新帳號。回應設定 httpOnly JWT cookie。

```json
{ "email": "user@example.com", "password": "至少6字", "display_name": "暱稱" }
```

#### `POST /api/auth/login`

登入。回應設定 httpOnly JWT cookie。

```json
{ "email": "user@example.com", "password": "密碼" }
```

#### `POST /api/auth/logout`

清除 JWT cookie。

#### `GET /api/auth/me`

回傳目前登入使用者資訊 `{ id, email, display_name, created_at }`，未登入回 401。

### 創作者

#### `GET /api/creators/stats?name=Alice`

查詢指定創作者的工具列表及總收益（公開端點）。回傳 `creator_name`、`tools`（含各工具 `usage_count`、`points_earned`）、`total_uses`、`total_points_earned`。

#### `GET /api/creators/me`（需登入）

查詢目前登入使用者的創作者統計，依 `owner_user_id` 聚合，不需輸入名稱。

---

### 評分

#### `POST /api/ratings/:toolId`

對工具給予評分。

```json
{ "stars": 5 }
```

`stars` 為整數，範圍 1–5。回應新的平均分與評分人數。

> 防止重複評分由前端透過 `localStorage` 處理（session 層級）。

---

### 留言

#### `GET /api/comments/:toolId`

取得工具的留言列表（最新在前）。

#### `POST /api/comments/:toolId`

新增留言。

```json
{ "body": "這個工具超好用！" }
```

`body` 不能為空，最多 500 字元。

---

### 透明度

#### `GET /api/transparency/summary`

公開唯讀端點，回傳平台營運概況。供透明度中心頁面使用。

**回應範例：**

```json
{ "active_tools": 12, "pending_tools": 3, "pending_reports": 1, "total_violations": 5 }
```

### RSS

#### `GET /api/feed.xml`

最近 30 筆上架工具的 RSS 2.0 feed。`Content-Type: application/rss+xml`。可用 RSS 閱讀器訂閱最新工具上架通知。

---

## 部署

### Render.com（推薦）

1. 前往 [render.com](https://render.com) 並用 GitHub 帳號登入
2. 點 **New → Blueprint**，選擇 `vibe-app-store` 儲存庫
3. Render 會自動讀取 `render.yaml`（含 **Persistent Disk** 與環境變數），確認後點 **Apply**
4. 約 2–3 分鐘後取得公開網址

> **資料持久化：** `render.yaml` 已宣告 1 GB Persistent Disk 掛載於 `/var/data`，`DB_PATH` 指向 `/var/data/appstore.db`。重新部署時**資料庫不會重置**。注意：Persistent Disk **需要付費方案**（Render 免費方案的磁碟為暫時性）。若使用免費方案，可在 Render 儀表板移除 disk 設定，但重部署會清空資料。
>
> **首次啟用磁碟後**，舊的暫時性資料不會自動遷移至新 disk；啟用後等同全新資料庫，種子資料會重新載入。

### 更新部署

每次推送到 `master` 分支，Render 會自動重新部署：

```bash
git add .
git commit -m "說明這次的變更"
git push
```

### 其他平台

任何支援 Node.js 的平台均可部署（Railway、Fly.io、VPS 等），確保設定正確的 `PORT` 與 `DB_PATH` 環境變數即可。

---

## API 濫用防護

- **POST**：`POST /api/*` 每 IP 每 15 分鐘 60 次，超過回傳 `429`。
- **GET**：其餘 `GET /api/*` 每 IP 每 15 分鐘 400 次；`GET /api/health` 除外。
- **登入/註冊**：`POST /api/auth/register` 和 `POST /api/auth/login` 額外套用更嚴格限流（每 15 分鐘 15 次/IP），防止撞庫攻擊。

部署於 Render 等反向代理時請設定 **`NODE_ENV=production`**，伺服器才會啟用 `trust proxy`，限流才會依**客戶端 IP** 計算（否則可能全部算成同一個內網 IP）。此設定為基本防護，不取代正式認證機制。

---

## 營運與種子內容

### 邀請第一批創作者

1. 在你的社群（Discord、Facebook 社團、LINE 群等）分享 `/for-creators.html` 招募頁。
2. 親自邀請 3–5 位信任的 AI 工具作者，請他們註冊並投稿。初期工具品質比數量重要。
3. 作為管理員，在 Admin 後台及時審核新投稿，縮短等待時間讓創作者有好體驗。

### 投稿檢查清單（給審核者）

- 工具連結使用 HTTPS 且可正常開啟
- 描述誠實反映工具功能，不誇大
- 不含惡意軟體、釣魚、仇恨或成人內容
- 標籤準確、語言標示正確
- 同一工具未重複提交

### 精選標記

符合精選資格（無違規、有評分、連結有效）的工具，管理員可在資料庫中設定 `is_featured = 1`。目前無自動精選機制，需人工判斷。

---

## 專案文件與 AI 協作

若你使用 Cursor、Copilot、Claude 等代理協助開發，請讓它們優先閱讀：

1. **[docs/AI_SOP.md](docs/AI_SOP.md)** — 產品 North Star、技術邊界、標準工作流程與驗收習慣（**減少每次重講 SOP**）。
2. **[AGENTS.md](AGENTS.md)** — 架構、資料表、API 一覽、程式慣例。
3. **[docs/DECISIONS.md](docs/DECISIONS.md)** — 已拍板決策（匿名投稿關閉、JWT、審核流程等）。

**工具自動載入：** **Cursor** → `.cursor/rules/vibe-app-store.mdc`。**Claude Code** → 根目錄 **[CLAUDE.md](CLAUDE.md)**（精簡版＋連結到上述三份文件，與 Cursor 規則對齊）。

---

## 常見問題

**Q：為什麼 iframe 預覽顯示「無法預覽」？**  
A：目標網站設定了 `X-Frame-Options` 或 `Content-Security-Policy`，禁止被嵌入 iframe。這是正常現象，點「直接開啟」按鈕即可在新分頁使用工具。

**Q：我提交的工具刷新後消失了？**  
A：如果使用 Render 免費方案，服務重啟時資料庫會重置。本地開發時不會發生此問題。

**Q：如何在 Windows 安裝 `sqlite3`？**  
A：`sqlite3` 套件有預編譯二進位，通常不需要額外設定。若遇到問題，請確認 Node.js 版本在 18 以上，並執行 `npm install --build-from-source sqlite3`。

**Q：Render 第一次開啟很慢？**  
A：免費方案在 15 分鐘無流量後會進入休眠狀態，第一個請求需要 30–50 秒喚醒。可用 [UptimeRobot](https://uptimerobot.com) 每 14 分鐘 ping 一次保持活躍。

---

## 貢獻

歡迎任何形式的貢獻！請先閱讀 [CONTRIBUTING.md](CONTRIBUTING.md)。

---

*用 AI 協作打造 · 中文優先 · 開放原始碼 · MIT License*
