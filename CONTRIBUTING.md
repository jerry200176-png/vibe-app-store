# 貢獻指南

感謝你願意改善 Vibe App Store！無論是回報 bug、提交功能、改善文件，任何貢獻都很歡迎。

---

## 開始之前

1. 閱讀 [README.md](README.md) 了解專案架構與本地執行方式
2. 確認 Node.js 版本 18 以上
3. 搜尋現有 [Issues](https://github.com/jerry200176-png/vibe-app-store/issues) 確認問題或功能尚未被提過

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

目前沒有自動測試，請手動驗證你修改的功能範圍：

| 功能 | 手動測試重點 |
|------|-------------|
| 工具列表 | 頁面載入、排序切換、標籤篩選 |
| 搜尋 | 中文關鍵字、英文關鍵字、無結果狀態 |
| 提交工具 | 必填驗證、無效 URL、成功後列表更新 |
| 評分 | 點擊星星、送出後分數更新、刷新後標記為已評分 |
| 留言 | 新增留言、Enter 送出、展開/收起留言面板 |
| iframe 預覽 | 可預覽的網站、不允許嵌入的網站（fallback） |

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
- JS 維持事件委派模式（在 `#tool-grid` 上監聽，不在每個卡片上 addListener）
- 使用 `esc()` 函式處理所有動態插入的 HTML 內容，防止 XSS

### 安全性原則

- URL 驗證：使用 `new URL()` 並確認協定為 `http:` 或 `https:`
- 輸入長度限制：title ≤ 80、desc ≤ 300、comment ≤ 500
- 所有回應避免洩漏 stack trace 或敏感路徑

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
