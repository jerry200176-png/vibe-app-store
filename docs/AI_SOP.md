# AI 代理標準作業程序（SOP）

**用途：** 維護者不必在每次對話重複說明專案目標與慣例。代理在動手改程式前應依本流程執行。

**閱讀順序（建議）：**

1. 本檔 `docs/AI_SOP.md`（要做什麼、怎麼驗收）
2. 專案根目錄 `AGENTS.md`（技術事實、目錄、API、禁止事項）
3. `docs/DECISIONS.md`（已定案決策，避免被推翻）
4. 變更時同步 `CHANGELOG.md`；若動到 API／schema 則更新 `README.md`

---

## 1. 產品意圖（North Star）

我們在做的不是「又一個連結目錄」，而是：

- **中文優先**的 AI 小工具發現與試用體驗（iframe 或新分頁）。
- **信任與安全**：新工具 **審核後才公開**（`pending` → 管理員核准 → `active`）；使用者可 **檢舉**，違規有 **Strike** 邏輯。
- **創作者需帳號**：投稿、編輯自己的工具需 **Email + 密碼登入**（JWT httpOnly cookie），**不接受匿名投稿**。
- **訪客仍可**：瀏覽公開列表、評分、留言（評分防重複僅靠瀏覽器 localStorage，屬刻意取捨）。
- **差異化敘事**：招募頁、透明度中心、隱私／條款、深層連結 `?tool=`、本週上新等已產品化，修改時勿無故刪除這條故事線。

若任務與上述衝突，應先向使用者確認，不要默默改產品邊界。

---

## 2. 技術邊界（必守）

| 項目 | 規則 |
|------|------|
| 正式前端 | 僅 `public/`。根目錄 `index.html` 僅 GitHub Pages 佔位，**不加功能**。 |
| 資料庫 | `sqlite` + `sqlite3` **async** API，**不用** `better-sqlite3`。 |
| 錯誤回應 | 路由 `catch` 使用 `sendServerError(res, e)`，生產環境不洩漏堆疊。 |
| 前端 XSS | 動態 HTML 必須經 `esc()`。 |
| 靜態資源 CSP | 勿在 `public/` 加 **inline script/style**（會撞 Helmet CSP）；admin 已外掛 `admin.js` / `admin-style.css`。 |
| 相依 | 不擅自加入大型前端框架或 CDN；新 npm 套件需有理由。 |
| API 認證 | 需登入的 route 用 `requireUser`；擁有權可選 `optionalUser` + `owner_user_id` 或舊版 `x-edit-token`。 |

---

## 3. 標準工作流程（接到任務時）

1. **釐清範圍**：要改的是 API、前端、靜態頁、admin、還是文件？是否影響審核／帳號流程？
2. **搜尋現況**：用搜尋工具找現有實作（例如 `requireUser`、`status = 'active'`），避免重複造輪子。
3. **最小變更**：只改達成需求所需的檔案；不做順手大重構。
4. **驗證**：
   - 後端：必要時 `node -e "require('./server/...')"` 或啟動 `npm run dev` 手測。
   - 前端：與認證相關的 `fetch` 必須 `credentials: 'include'`（專案已集中在 `apiFetch`）。
5. **文件**：變更寫入 `CHANGELOG.md` **\[Unreleased\]**；API／schema 變更更新 `README.md`；架構慣例變更更新 `AGENTS.md`。若本次等同**可發布版本**（例如使用者要求發版、或累積功能該切段），應**訂語意化版號**：將 `[Unreleased]` 內容移入新版本標題（如 `## [2.1.0] - YYYY-MM-DD`）、清空 `[Unreleased]` 佔位說明、`package.json` 的 `version` 對齊，並更新 `CHANGELOG.md` 底部 compare 連結。
6. **不要改**：使用者提供的計畫檔（例如 `.cursor/plans/*.plan.md`）除非使用者明確要求。
7. **同步 GitHub（預設必做，不必等使用者提醒）**：只要本次對話**已做出可交付的檔案變更**，且使用者**沒有**說「不要提交／不要 push／僅本地／先別動 git」，代理應在收尾時**主動**完成版本控制與遠端更新：
   - `git status` 確認變更；**勿** `git add` 機敏或已忽略路徑（`.env`、`.claude/`、`data/*.db` 等）。
   - `git add` 本次相關檔案後 `git commit -m "type: 簡短說明"`（類型見 `CONTRIBUTING.md`，繁中或英文皆可）。
   - `git push` 至 **`origin` 的目前分支**（先 `git branch --show-current` 若需要）。
   - 若沒有變更、或僅探索未改檔，則不必空 commit。
   - 若 push 失敗（衝突、未登入、無權限），向使用者說明原因與建議下一步（例如 `git pull --rebase`、檢查 `gh auth`／SSH）。
8. **例外**：使用者明確只要 diff、實驗分支、或由人類自行發 PR 時，略過第 7 步。

---

## 4. 手動驗收檢查表（與 CONTRIBUTING 對齊）

改動涉及下列區域時，至少手動測過相關列：

- 公開列表、`since_days`、本週上新、創作者篩選、標籤
- 註冊／登入／登出、提交工具（未登入應看不到表單或 API 401）
- 創作者工作室：`/api/tools/me`、`/api/creators/me`、內嵌編輯／刪除
- 深層連結 `?tool=<id>`、卡片分享連結
- 檢舉、社群準則 modal、footer 法務／透明度連結
- Admin（`ADMIN_KEY`）、審核 pending → active
- `GET /api/transparency/summary`、transparency 頁載入數字

（完整表格見 `CONTRIBUTING.md`。）

---

## 5. 常見錯誤（避免）

- 以為 `GET /api/tools` 會回傳 pending（**只回 active**）。
- 在路由裡 `res.status(500).json({ error: e.message })` 洩漏內部錯誤。
- 忘記事件委派需同步更新 `#tool-grid`、`#featured-grid`、`#followed-grid`（卡片互動）。
- README 寫「前端只有三個檔案」（已過時，見 `README` 目錄結構）。
- **改完程式卻未 commit／push**（使用者未禁止時應主動同步 GitHub）。

---

## 6. 文件索引

| 檔案 | 用途 |
|------|------|
| `CLAUDE.md` | **Claude Code** 自動載入的專案指引（導向本檔與 `AGENTS`） |
| `.cursor/rules/vibe-app-store.mdc` | **Cursor** 自動載入的規則 |
| `AGENTS.md` | 給 AI 的技術單一真相來源（架構、API、schema） |
| `docs/AI_SOP.md` | 本檔：產品意圖與工作流程 |
| `docs/DECISIONS.md` | 已定案決策紀錄 |
| `README.md` | 人類使用者、部署、API 參考 |
| `CONTRIBUTING.md` | PR、手動測試、程式風格 |
| `SECURITY.md` | 漏洞回報、威脅與取捨 |
| `CHANGELOG.md` | 版本與變更紀錄 |
