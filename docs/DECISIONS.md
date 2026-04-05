# 架構與產品決策紀錄（ADR 精簡版）

本檔記錄 **已拍板** 的決策，避免新對話中的 AI 或貢獻者重複爭議或誤改方向。  
若要推翻某條決策，應經維護者同意並在本檔新增「廢止／取代」條目 + `CHANGELOG.md`。

---

## ADR-001：創作者必須登入才能投稿

- **狀態：** 已採納  
- **情境：** 匿名投稿可偽造 `creator_name`，難以究責與管理。  
- **決定：** `POST /api/tools` 必須 `requireUser`；`creator_name` 由後端取自 `users.display_name`；`owner_user_id` 綁定。  
- **後果：** 舊工具 `owner_user_id IS NULL` 仍可依 `x-edit-token` 編輯（過渡期）。

---

## ADR-002：新工具預設審核中（pending），公開列表僅 active

- **狀態：** 已採納  
- **決定：** `GET /api/tools` 一律 `t.status = 'active'`；新建為 `pending`，由 Admin API 核准。  
- **後果：** 前端「所有工具」永遠看不到待審稿；創作者在工作室可看自己的 pending。

---

## ADR-003：訪客評分／留言不強制帳號

- **狀態：** 已採納  
- **決定：** 評分防重複以 `localStorage` 為主；留言可匿名 POST。  
- **後果：** 可清 cookie／換瀏覽器重複評分，屬可接受的 MVP 取捨（見 `SECURITY.md`）。

---

## ADR-004：Session 使用 JWT httpOnly Cookie

- **狀態：** 已採納  
- **決定：** Cookie 名稱 `vibe_token`；`httpOnly`；生產環境 `secure: true`、`sameSite: 'lax'`；機密 `JWT_SECRET`。  
- **後果：** 前端需 `credentials: 'include'`（專案 `apiFetch` 已統一）。

---

## ADR-005：SQLite 檔案庫 + Render 暫存磁碟取捨

- **狀態：** 已採納  
- **決定：** 維持 SQLite，部署以 Render 為主；免費方案重啟可能丟資料。  
- **後果：** README 已說明；若要持久化需 Persistent Disk 或外部 DB（未實作則不預設）。

---

## ADR-006：Helmet CSP — 禁止 inline script/style

- **狀態：** 已採納  
- **決定：** `scriptSrc` / `styleSrc` 僅 `'self'`；admin 頁以外掛 `admin.js` / `admin-style.css` 符合 CSP。  
- **後果：** 新增頁面勿依賴 inline JS/CSS。

---

## ADR-007：Admin API 以 `ADMIN_KEY` 保護

- **狀態：** 已採納  
- **決定：** 管理操作透過 `/api/admin/*`，標頭帶管理金鑰（見 `server/routes/admin.js` 實作）。  
- **後果：** 生產環境必須設定強隨機 `ADMIN_KEY`。

---

## ADR-008：透明度公開 API

- **狀態：** 已採納  
- **決定：** `GET /api/transparency/summary` 公開唯讀，供 `transparency.html` 顯示營運快照。  
- **後果：** 不暴露個資；僅聚合計數。

---

## 修訂紀錄

| 日期 | 說明 |
|------|------|
| 2026-04-05 | 初版：整理與程式碼一致的關鍵決策 |
