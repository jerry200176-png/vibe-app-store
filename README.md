# ⚡ Vibe App Store

> 探索、評分與討論由 **AI 協作打造**的小工具 — 亞洲社群的開放目錄，無需帳號即可使用。

**線上網址（完整版）：** 部署至 Render 後取得  
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
| ➕ 提交工具 | 填寫名稱、描述、網址、創作者、費用、標籤、語言即可送出 |
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

> 整個前端只有三個檔案：`public/index.html`、`public/style.css`、`public/app.js`，無需任何建置步驟。

---

## 目錄結構

```
vibe-app-store/
├── server/
│   ├── index.js          # Express 入口、路由掛載、靜態檔服務
│   ├── db.js             # SQLite 連線、schema + migration、種子資料
│   └── routes/
│       ├── tools.js      # GET/POST /api/tools, POST /api/tools/:id/use
│       ├── ratings.js    # POST /api/ratings/:toolId
│       ├── comments.js   # GET/POST /api/comments/:toolId
│       └── creators.js   # GET /api/creators/stats
├── public/
│   ├── index.html        # 前端殼層（引用下方兩個檔案）
│   ├── style.css         # 所有樣式（深色主題、響應式）
│   └── app.js            # 所有前端邏輯（fetch API、互動、點數系統）
├── data/                 # 執行時自動建立，存放 appstore.db（已 gitignore）
├── index.html            # GitHub Pages 用的靜態版本（不含後端功能）
├── package.json
├── render.yaml           # Render.com 一鍵部署設定
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

可建立 `.env` 檔案（已在 `.gitignore` 中）或直接於 Render 的環境變數設定。

---

## API 文件

基底路徑：`/api`，所有請求與回應均為 JSON。

### 工具

#### `GET /api/tools`

列出所有工具（含聚合評分與留言數）。

**Query 參數：**

| 參數 | 可選值 | 預設 | 說明 |
|------|--------|------|------|
| `sort` | `newest` \| `top` \| `trending` | `newest` | 排序方式 |
| `tag` | 任意字串 | — | 依標籤篩選 |
| `creator` | 任意字串 | — | 依創作者名稱篩選（不分大小寫） |

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

#### `POST /api/tools`

新增工具。

**Request body：**

```json
{
  "title": "工具名稱",
  "desc": "工具描述",
  "url": "https://your-tool.example.com",
  "creator_name": "你的名字",
  "cost": 10,
  "tags": ["ai", "生產力"],
  "lang": "中文"
}
```

驗證規則：`title`、`desc`、`url`、`creator_name` 為必填；`url` 必須是 `http://` 或 `https://` 開頭；`cost` 為 0–100 整數（0 = 免費）；`tags` 最多 5 個；`desc` 最多 300 字元。不接受 `is_featured`（僅能由後端設定）。

#### `POST /api/tools/:id/use`

記錄一次工具使用事件。若工具有費用，同時累加 `usage_count` 與 `points_earned`。

**回應：** `{ "usage_count": 43, "points_earned": 430, "cost": 10 }`

---

### 創作者

#### `GET /api/creators/stats?name=Alice`

查詢指定創作者的工具列表及總收益。回傳 `creator_name`、`tools`（含各工具 `usage_count`、`points_earned`）、`total_uses`、`total_points_earned`。

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

## 部署

### Render.com（推薦，免費方案）

1. 前往 [render.com](https://render.com) 並用 GitHub 帳號登入
2. 點 **New → Web Service**，選擇 `vibe-app-store` 儲存庫
3. Render 會自動讀取 `render.yaml`，設定已完成
4. 點 **Deploy**，約 2–3 分鐘後取得公開網址

> **注意：** Render 免費方案的磁碟為暫時性，重新部署後資料庫會重置。若需要持久化資料，可升級至付費方案並使用 Persistent Disk，或改用雲端資料庫（如 Supabase、PlanetScale）。

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
