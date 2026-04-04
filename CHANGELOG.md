# Changelog

本專案遵循 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/) 格式，版本號採 [Semantic Versioning](https://semver.org/lang/zh-TW/)。

---

## [Unreleased]

> 在此記錄尚未發布的功能或修正。

---

## [1.0.0] - 2026-04-05

### 新增

- **後端**：Node.js + Express 伺服器（`server/index.js`）
- **資料庫**：SQLite 持久化儲存（`server/db.js`），使用 `sqlite` + `sqlite3` 套件
- **REST API**：
  - `GET /api/tools` — 支援 `sort`（newest / top）與 `tag` 篩選
  - `POST /api/tools` — 新增工具，含 URL 格式驗證
  - `POST /api/ratings/:toolId` — 1–5 星評分
  - `GET /api/comments/:toolId` — 取得留言列表
  - `POST /api/comments/:toolId` — 新增留言
- **評分系統**：星等評分 UI、即時更新平均分，透過 `localStorage` 防止 session 內重複評分
- **留言系統**：可展開的留言面板、Enter 快速送出、相對時間顯示
- **排序**：最新 / 評分最高
- **標籤篩選**：動態標籤 chip，點擊即篩選
- **iframe 預覽 Modal**：嵌入預覽 + 偵測失敗時顯示 fallback 按鈕
- **前端拆分**：HTML / CSS / JS 分離至 `public/` 目錄
- **部署設定**：`render.yaml` 支援 Render.com 一鍵部署

### 變更

- 前端從單一 `index.html` 重構為 `public/` 下的三個獨立檔案
- 狀態管理從 in-memory JS 陣列改為 API fetch 呼叫
- 移除舊的 `upvote` 機制，改為 1–5 星評分系統

---

## [0.1.0] - 2026-04-05

### 新增

- 單一 `index.html` 靜態應用（純 HTML + CSS + JS，無後端）
- 工具列表（卡片式呈現）與即時搜尋
- 基本表單：提交新工具（名稱、描述、網址、標籤、語言）
- 上投票 (upvote) 系統（in-memory，重整後重置）
- 5 筆範例工具（亞洲市場相關）
- 繁體中文介面，加入 PingFang TC / Microsoft JhengHei 字體
- 部署至 GitHub Pages
- `render.yaml`、`README`、`CONTRIBUTING`、`SECURITY`、`AGENTS`、`CHANGELOG` 等專案文件

---

[Unreleased]: https://github.com/jerry200176-png/vibe-app-store/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/jerry200176-png/vibe-app-store/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/jerry200176-png/vibe-app-store/releases/tag/v0.1.0
