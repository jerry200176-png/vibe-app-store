# 安全性政策

## 支援中的版本

| 版本 | 支援狀態 |
|------|----------|
| `master` 分支最新提交 | ✅ 積極維護 |
| 其他 Fork 或舊提交 | ⚠️ 不在支援範圍，請自行追蹤上游更新 |

---

## 回報漏洞

若你發現可能影響使用者資料、伺服器或供應鏈的安全性問題，**請不要公開建立 Issue**，以免漏洞在修補前被利用。

### 私下回報管道

**方式一（建議）：** 使用 GitHub Private Vulnerability Reporting

在 GitHub 儲存庫頁面點選：**Security → Report a vulnerability**

**方式二：** 透過 GitHub 私訊聯繫維護者 **[@jerry200176-png](https://github.com/jerry200176-png)**

### 回報內容建議包含

- 問題類型（XSS、SQL Injection、路徑穿越、開放重定向等）
- 影響範圍（哪些使用者或資料受影響）
- 重現步驟或概念驗證（PoC）描述
- 受影響的程式碼位置（例如 `server/routes/tools.js`）

### 處理流程

1. 收到回報後，我們會在 **7 個工作天**內確認是否收到並開始評估
2. 嚴重漏洞會優先修補，修補完成後發布包含安全性更新的新版本
3. 修補後可在 [CHANGELOG.md](CHANGELOG.md) 以「安全性更新」記錄，不揭露攻擊細節

---

## 已知的安全性考量

以下是目前設計上的取捨，並非漏洞，但貢獻者與 AI 代理應了解：

| 項目 | 現況 | 說明 |
|------|------|------|
| 身分邊界 | 創作者需帳號；訪客可互動 | **投稿／編輯自己的工具**需登入（JWT httpOnly cookie，名稱 `vibe_token`）。**評分與留言**仍允許未登入使用。 |
| 評分防重複 | 僅 localStorage | 訪客可清除 storage 或換瀏覽器重複評分；屬 MVP 取捨，**與「創作者需帳號」並存**。若未來要強制一人一票，需帳號綁定評分並改 schema。 |
| 留言與濫用 | 後端有 POST 全局限流 | `POST /api/*` 有 rate limit；仍無 captcha、無逐留言 IP 黑名單，垃圾留言風險仍存在。 |
| 輸入驗證 | 後端長度與格式檢查 | URL 驗證僅檢查 `http://`/`https://` 協定，不掃描惡意 URL |
| 資料庫 | SQLite 本地檔案 | 無認證，假設伺服器檔案存取已受保護；Render 免費方案磁碟非持久化時資料可能於重部署後遺失 |
| 管理後台 | `ADMIN_KEY` | 金鑰洩漏等同後門；生產環境必須使用強隨機值並僅存環境變數。 |

---

## 開發者本機設定（Claude Code 等）

**`.claude/` 目錄**（例如 `.claude/settings.local.json`）由 **Claude Code** 用來存放專案級、本機端的設定，常見內容包含：

- 你已允許代理執行的 **Bash 指令模式**（減少重複確認）
- 若曾貼過指令，檔案中可能意外含有 **雲端 API Token、Bearer 金鑰** 等機敏字串

**請遵守：**

- **不要**將 `.claude/` 提交到 Git 或分享給他人。本倉庫 `.gitignore` 已排除 `.claude/`；請勿使用 `git add -f` 強制加入。
- **不要**在截圖、錄影、Issue／PR 中露出 `settings.local.json` 全文。
- 若懷疑內容已外洩（例如曾 commit、曾貼到公開頻道），請至對應服務（如 Render、GitHub）**撤銷並輪替金鑰**。

正式部署用的密鑰請一律放在 **環境變數**（如 Render Dashboard、`JWT_SECRET`、`ADMIN_KEY`），不要寫進任何會進版控的檔案。

---

## 一般 Bug

非安全性相關的 Bug 請使用公開 **[Issues](https://github.com/jerry200176-png/vibe-app-store/issues)**，依 [CONTRIBUTING.md](CONTRIBUTING.md) 的格式回報。
