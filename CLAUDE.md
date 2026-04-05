# Claude Code — 專案指引

本檔供 **Claude Code**（終端機／IDE 外掛）在進入此儲存庫時載入。與 Cursor 的 `.cursor/rules/vibe-app-store.mdc` 對齊同一套規範。

---

## 開始寫程式前請讀

| 優先序 | 檔案 | 內容 |
|--------|------|------|
| 1 | `docs/AI_SOP.md` | 產品意圖（North Star）、工作流程、驗收習慣 |
| 2 | `AGENTS.md` | 架構、資料表、API 表、前端慣例、禁止事項 |
| 3 | `docs/DECISIONS.md` | 已定案決策（勿擅自推翻匿名投稿關閉、審核流程等） |

實作細節以 **程式碼與 `AGENTS.md` 為準**；本檔只負責導航與提醒。

---

## 必守摘要

- **正式 UI** 只在 `public/`；根目錄 `index.html` 僅 GitHub Pages 佔位。
- **公開列表** 僅 `tools.status = active`；新投稿為 `pending`，需 Admin 核准。
- **投稿／編輯工具** 需登入（JWT httpOnly cookie `vibe_token`）；`POST /api/tools` 用 `requireUser`。
- 後端路由 `catch` 使用 **`sendServerError(res, e)`**，勿把 `e.message` 直接回給客戶端。
- 前端動態 HTML 必須 **`esc()`**；**勿**在 `public/` 加 inline script/style（Helmet CSP）。
- DB 使用 **`sqlite` + `sqlite3` async**，不要用 `better-sqlite3`。
- 卡片互動事件委派掛在 **`#tool-grid`、`#featured-grid`、`#followed-grid`**（見 `app.js`）。
- 需 cookie 的 `fetch` 已集中在 **`apiFetch`（`credentials: 'include'`）**。

---

## 變更後文件義務

- 行為或 API 有變：`CHANGELOG.md` 的 `[Unreleased]`。
- API／schema：`README.md`。
- 架構慣例：`AGENTS.md`。
- **產品邊界** 有變：`docs/DECISIONS.md` + `docs/AI_SOP.md`。

## 交付後（預設）：GitHub

完成可交付的檔案變更後，**除非使用者說不要提交／不要 push**，應主動：`git status` → `git add`（略過 `.env`、`.claude/`、`data/*.db`）→ `git commit` → `git push` 至目前分支。細節與例外見 `docs/AI_SOP.md` 第 3 節步驟 7–8。

---

## 不要做的事

- 不要編輯使用者提供的 **`.cursor/plans/*.plan.md`**，除非使用者明確要求。
- 不要未確認就開放匿名投稿、或在公開列表顯示 `pending`。
- 不要擅自加入 CDN 或大型前端框架（除非使用者同意）。

---

## 其他

- 人類流程與 PR：`CONTRIBUTING.md`
- 安全回報、威脅取捨、**勿提交 `.claude/`**：`SECURITY.md`
- Cursor 規則：`.cursor/rules/vibe-app-store.mdc`
