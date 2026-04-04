# Vibe App Store

探索、評分與討論由 **AI 協助開發** 的小工具——開放目錄，無需註冊即可瀏覽與提交。

**線上預覽（GitHub Pages）：** [jerry200176-png.github.io/vibe-app-store](https://jerry200176-png.github.io/vibe-app-store/)

> GitHub Pages 僅能託管靜態檔案。若要使用完整功能（SQLite 持久化、REST API、評分與留言），請在本地或自有主機執行下方「本地開發」步驟。

---

## 專案簡介

Vibe App Store 是社群向的 **AI 工具目錄**：卡片列表、搜尋與篩選、提交新工具，並可對工具給予星等評分與留言。介面以中文為主，適合亞洲使用者快速發現可試用的工具。

---

## 功能一覽

| 功能 | 說明 |
|------|------|
| 工具列表 | 名稱、描述、標籤、語系、建立時間；支援依標籤篩選、依「最新／評分最高」排序 |
| 搜尋 | 前端即時篩選標題、描述、標籤 |
| 評分 | `POST /api/ratings/:toolId`，1～5 星（可多次提交，後端計算平均） |
| 留言 | `GET`／`POST /api/comments/:toolId` |
| 提交工具 | `POST /api/tools`，驗證必填欄位與 `http`／`https` 網址 |
| 內嵌預覽 | 前端 modal 以 iframe 預覽工具網址（受目標站 CSP 限制時會 fallback） |

---

## 技術棧

| 層級 | 技術 |
|------|------|
| 後端 | [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/) |
| 資料庫 | [SQLite](https://www.sqlite.org/)（[better-sqlite3](https://github.com/WiseLibs/better-sqlite3)） |
| 前端 | `public/` 內靜態 HTML、CSS、`app.js`（由 Express 提供） |
| 部署（完整版） | 需可執行 Node 的環境；資料檔預設為 `data/appstore.db` |

---

## 目錄結構

```
vibe-app-store/
├── server/           # Express 入口與 API
│   ├── index.js
│   ├── db.js         # SQLite 連線、schema、初次種子資料
│   └── routes/       # tools / ratings / comments
├── public/           # 前端（index.html、style.css、app.js）
├── data/             # 執行時建立，存放 *.db（已列入 .gitignore）
├── index.html        # 可選：舊版單檔或 GitHub Pages 用，與 public 分岔時請自行對齊
├── package.json
└── README.md
```

---

## 需求

- **Node.js** 18+（建議 LTS）
- 具 **npm** 或相容的套件管理器

Windows 安裝 `better-sqlite3` 時需有建置環境（常見為「Visual Studio Build Tools」）；若安裝失敗，請依 [better-sqlite3 說明](https://github.com/WiseLibs/better-sqlite3) 補齊工具鏈。

---

## 本地開發

```bash
git clone https://github.com/jerry200176-png/vibe-app-store.git
cd vibe-app-store
npm install
npm run dev
```

瀏覽器開啟 **http://localhost:3000**（埠號可透過環境變數覆寫，見下節）。

- `npm start`：正式模式（無 watch）
- `npm run dev`：使用 `node --watch` 於檔案變更時重啟伺服器

---

## 環境變數

| 變數 | 預設 | 說明 |
|------|------|------|
| `PORT` | `3000` | HTTP 監聽埠 |
| `DB_PATH` | `data/appstore.db`（相對於專案根目錄） | SQLite 檔案路徑 |

---

## API 摘要

基底路徑：`/api`

| 方法 | 路徑 | 說明 |
|------|------|------|
| `GET` | `/tools?sort=newest\|top&tag=` | 列表；`tag` 可選 |
| `POST` | `/tools` | 新增工具；JSON：`title`, `desc`, `url`, `tags`, `lang` |
| `POST` | `/ratings/:toolId` | JSON：`stars`（1–5） |
| `GET` | `/comments/:toolId` | 留言列表 |
| `POST` | `/comments/:toolId` | JSON：`body`（最多 500 字） |

詳細行為以 `server/routes/*.js` 為準。

---

## 部署與同步 GitHub

```bash
git add -A
git commit -m "描述這次變更"
git push origin master
```

- **僅靜態頁**：可繼續用 [GitHub Pages](https://pages.github.com/) 發布根目錄或 `docs/`／指定分支，但 **不會** 帶上 Node API 與資料庫。
- **完整網站**：請部署到支援 Node 的平台（例如雲端 VM、Railway、Render、Fly.io 等），設定 `PORT`／`DB_PATH` 並持久化 `data` 目錄（若需要）。

---

## 貢獻與規範

請閱讀 [CONTRIBUTING.md](CONTRIBUTING.md)。安全性問題請依 [SECURITY.md](SECURITY.md) 私下回報，勿公開 Issue。

---

## 授權

[MIT License](LICENSE)

---

*用 AI 協作打造 · 開放原始碼*
