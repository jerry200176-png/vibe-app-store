# 貢獻指南

感謝你願意改善 Vibe App Store！無論是回報 bug、提交功能、改善文件，任何貢獻都很歡迎。

---

## 開始之前

1. 閱讀 [README.md](README.md) 了解專案架構與本地執行方式
2. **使用 AI 協助開發時**：一併閱讀 [docs/AI_SOP.md](docs/AI_SOP.md) 與 [AGENTS.md](AGENTS.md)。**Claude Code** 會讀取根目錄 [CLAUDE.md](CLAUDE.md)；**Cursor** 會套用 `.cursor/rules/vibe-app-store.mdc`
3. 確認 Node.js 版本 18 以上
4. 搜尋現有 [Issues](https://github.com/jerry200176-png/vibe-app-store/issues) 確認問題或功能尚未被提過

---

## 開發流程

### 1. Fork 並建立分支

```bash
# Fork 後複製你的 fork
git clone https://github.com/<你的帳號>/vibe-app-store.git
cd vibe-app-store

# 建立功能分支（命名建議）
git checkout -b feat/tag-filter      # 新功能
git checkout -b fix/search-encoding  # bug 修復
git checkout -b docs/update-api      # 文件更新
```

### 2. 安裝與執行

```bash
npm install
npm run dev   # 開發伺服器，http://localhost:3000
```

### 3. 開發與測試

CI 會在每次 push 與 PR 時執行 `npm test`（smoke test），確保核心模組載入與 API 啟動正常。PR 需通過 CI 才可合併。手動測試仍然重要，請驗證你修改的功能範圍：

| 功能 | 手動測試重點 |
|------|-------------|
| 工具列表 | 頁面載入、排序（最新／評分／熱門）、標籤與創作者篩選 |
| 本週上新 | 「本週上新」按鈕、`since_days` 與其他篩選併用、再次點擊取消 |
| 搜尋 | 中文／英文關鍵字、無結果狀態 |
| 帳號 | 註冊、登入、登出；未登入時提交分頁僅顯示 gate |
| 提交工具 | 登入後必填驗證、無效 URL、成功後工作室可見 **審核中**；公開列表不出現直至核准 |
| 創作者工作室 | `我的工具` 列表、統計、內嵌編輯／刪除、複製宣傳連結 |
| 深層連結 | `/?tool=<id>` 捲動並高亮卡片（工具須已 active） |
| 追蹤創作者 | 追蹤／取消、追蹤區塊顯示；7 天內新工具「新」badge |
| 評分 | 點擊星星、送出後分數更新、刷新後標記為已評分 |
| 留言 | bottom sheet、新增留言、Enter 送出 |
| 檢舉 | 工具與留言檢舉表單送出 |
| iframe 預覽 | 可嵌入與不可嵌入（fallback）、扣點工具點數不足提示 |
| 靜態與合規 | `/for-creators.html`、`/transparency.html`（數字載入）、`/privacy.html`、`/terms.html`、Cookie 條幅 |
| Admin | `admin.html` + `ADMIN_KEY`：待審列表、核准後首頁可見 |
| API（可選） | `GET /api/transparency/summary`、`GET /api/health` |

### 4. 提交

```bash
git add .
git commit -m "feat: 新增依語言篩選功能"
```

**提交訊息格式（建議）：**

```
<type>: <簡短說明>

<可選的詳細說明>
```

類型：`feat`（新功能）、`fix`（bug 修復）、`docs`（文件）、`refactor`（重構）、`chore`（雜務）

中文或英文皆可。

### 5. 開 Pull Request

- 說明「做了什麼」與「為什麼」
- 如果關聯到某個 Issue，加上 `Closes #123`
- 若更動 API 或資料庫 schema，同步更新 `README.md` 的 API 文件與 `CHANGELOG.md`
- 若更動**產品邊界**（審核流程、匿名／登入規則、公開列表條件），同步更新 `docs/DECISIONS.md` 與 `docs/AI_SOP.md`（必要時 `AGENTS.md`）

### AI／自動化代理（Cursor、Claude Code）

維護者期望：**每次在 repo 內完成可交付變更後，預設主動 `git commit` 並 `git push`**，不必等人類重複提醒。例外：使用者明確說不要動 git、僅探索、或要人類自行發 PR。詳見 [docs/AI_SOP.md](docs/AI_SOP.md) 第 3 節步驟 7–8。

---

## 程式風格

### 後端（Node.js）

- 每個路由檔案只負責一個資源（tools / ratings / comments）
- 資料庫操作集中在 `server/db.js` 與 `server/routes/`
- 使用 async/await，不要用 callback 風格
- 所有使用者輸入在路由層驗證，不依賴前端

### 前端（HTML / CSS / JS）

- 不引入未經討論的大型框架（jQuery、React、Vue 等）
- CSS 使用已定義的 CSS 變數（`--accent`、`--surface` 等），不寫魔法數字顏色
- JS 維持事件委派模式（在 `#tool-grid`、`#featured-grid`、`#followed-grid` 上監聽，見 `app.js` 的 `attachGridEvents`）
- 使用 `esc()` 函式處理所有動態插入的 HTML 內容，防止 XSS

### 安全性原則

- URL 驗證：使用 `new URL()` 並確認協定為 `http:` 或 `https:`
- 輸入長度限制：title ≤ 80、desc ≤ 300、comment ≤ 500
- 所有回應避免洩漏 stack trace 或敏感路徑；後端路由 `catch` 請使用 `sendServerError(res, e)`（見 `server/util/httpError.js`）

---

## Issue 回報格式

### Bug 回報

```
**環境**
- OS：Windows 11 / macOS 14 / Ubuntu 22.04
- Node.js：v20.x
- 瀏覽器：Chrome 123

**重現步驟**
1. 前往首頁
2. 點擊「試用」按鈕
3. ...

**預期行為**
...

**實際行為**
...

**截圖或錯誤訊息（若有）**
```

### 功能建議

```
**使用情境**
作為一個 ___, 我希望能 ___, 以便 ___。

**建議的行為或介面**
...

**替代方案（若你考慮過）**
...
```

---

## 不適合提交的 PR

為了保持程式碼品質與審查效率，以下類型的 PR 通常不會被合併：

- 僅調整空白、縮排或引號風格的大規模格式化（除非整個檔案都要重整）
- 加入未討論的新相依套件（特別是體積大的）
- 將正常的 `console.error` 改成 `console.log`（反之亦然）且沒有功能原因
- 同時混合功能開發與大量重構

---

## 社群行為準則

- 保持尊重與建設性，歡迎不同程度的貢獻者
- 回報 bug 時請附上重現步驟，猜測性的 Issue 難以處理
- 安全性漏洞請透過 [SECURITY.md](SECURITY.md) 的私下管道回報

---

感謝你的貢獻 🙌
