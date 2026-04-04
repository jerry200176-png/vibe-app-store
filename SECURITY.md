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

以下是目前設計上的取捨，並非漏洞，但貢獻者應了解：

| 項目 | 現況 | 說明 |
|------|------|------|
| 評分防重複 | 僅 localStorage | 可被手動清除 localStorage 繞過，屬於有意取捨（無帳號設計） |
| 留言垃圾訊息 | 僅前端限速 | 無 captcha 或 IP 限速，適合早期 MVP |
| 輸入驗證 | 後端長度與格式檢查 | URL 驗證僅檢查 `http://`/`https://` 協定，不掃描惡意 URL |
| 資料庫 | SQLite 本地檔案 | 無認證，假設伺服器存取已受保護 |

---

## 一般 Bug

非安全性相關的 Bug 請使用公開 **[Issues](https://github.com/jerry200176-png/vibe-app-store/issues)**，依 [CONTRIBUTING.md](CONTRIBUTING.md) 的格式回報。
