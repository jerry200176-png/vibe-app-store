const { open }  = require('sqlite');
const sqlite3   = require('sqlite3');
const path      = require('path');
const fs        = require('fs');
const crypto    = require('crypto');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'appstore.db');
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

let db;

async function getDb() {
  if (db) return db;

  db = await open({ filename: DB_PATH, driver: sqlite3.Database });

  await db.exec(`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;`);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS tools (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT    NOT NULL,
      desc       TEXT    NOT NULL,
      url        TEXT    NOT NULL,
      tags       TEXT    NOT NULL DEFAULT '[]',
      lang       TEXT    NOT NULL DEFAULT '中文',
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS ratings (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      tool_id    INTEGER NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
      stars      INTEGER NOT NULL CHECK(stars BETWEEN 1 AND 5),
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS comments (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      tool_id    INTEGER NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
      body       TEXT    NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS usage_log (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      tool_id    INTEGER NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      display_name  TEXT    NOT NULL,
      created_at    INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS reports (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      target_type TEXT    NOT NULL CHECK(target_type IN ('tool','comment')),
      target_id   INTEGER NOT NULL,
      reason      TEXT    NOT NULL,
      detail      TEXT    NOT NULL DEFAULT '',
      status      TEXT    NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','resolved','dismissed')),
      created_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS violations (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      creator_name TEXT    NOT NULL,
      tool_id      INTEGER REFERENCES tools(id) ON DELETE SET NULL,
      report_id    INTEGER REFERENCES reports(id),
      reason       TEXT    NOT NULL,
      created_at   INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS ratings_fp (
      tool_id INTEGER NOT NULL,
      fp      TEXT    NOT NULL,
      PRIMARY KEY (tool_id, fp)
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type       TEXT    NOT NULL,
      tool_id    INTEGER REFERENCES tools(id) ON DELETE CASCADE,
      tool_title TEXT    NOT NULL,
      detail     TEXT    NOT NULL,
      is_read    INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);

  await db.exec(`CREATE INDEX IF NOT EXISTS idx_usage_log_tool_time ON usage_log(tool_id, created_at);`);
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at);`);
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);`);
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_violations_creator ON violations(creator_name);`);

  // Idempotent column additions for v2
  const cols = await db.all(`PRAGMA table_info(tools)`);
  const has = name => cols.some(c => c.name === name);

  if (!has('creator_name'))
    await db.exec(`ALTER TABLE tools ADD COLUMN creator_name TEXT NOT NULL DEFAULT 'Community'`);
  if (!has('cost'))
    await db.exec(`ALTER TABLE tools ADD COLUMN cost INTEGER NOT NULL DEFAULT 0`);
  if (!has('usage_count'))
    await db.exec(`ALTER TABLE tools ADD COLUMN usage_count INTEGER NOT NULL DEFAULT 0`);
  if (!has('points_earned'))
    await db.exec(`ALTER TABLE tools ADD COLUMN points_earned INTEGER NOT NULL DEFAULT 0`);
  if (!has('is_featured'))
    await db.exec(`ALTER TABLE tools ADD COLUMN is_featured INTEGER NOT NULL DEFAULT 0`);
  if (!has('status'))
    await db.exec(`ALTER TABLE tools ADD COLUMN status TEXT NOT NULL DEFAULT 'active'`);
  if (!has('edit_token_hash'))
    await db.exec(`ALTER TABLE tools ADD COLUMN edit_token_hash TEXT`);
  if (!has('reviewed_at'))
    await db.exec(`ALTER TABLE tools ADD COLUMN reviewed_at INTEGER`);
  if (!has('owner_user_id'))
    await db.exec(`ALTER TABLE tools ADD COLUMN owner_user_id INTEGER REFERENCES users(id)`);

  await db.exec(`CREATE INDEX IF NOT EXISTS idx_tools_owner ON tools(owner_user_id);`);

  // Seed initial tools if empty
  const { n } = await db.get('SELECT COUNT(*) as n FROM tools');
  if (n === 0) {
    const ins = `INSERT INTO tools (title, desc, url, tags, lang, creator_name, cost, is_featured, status, reviewed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', unixepoch())`;
    await db.run(ins,
      '履歷健診 AI',
      '把你的履歷貼進來，AI 從 HR 視角找出致命弱點：格式錯誤、關鍵字缺漏、數據不夠具體⋯⋯30 秒讓你知道為什麼石沉大海，附上逐條改寫建議。',
      'https://resume-roaster.vercel.app',
      JSON.stringify(['求職','ai','履歷']), '中文', 'Alice', 10, 1);
    await db.run(ins,
      'Git Commit 訊息生成器',
      '把 git diff 或改動摘要貼進來，自動輸出符合 Conventional Commits 規範的訊息，支援 feat / fix / refactor 等類型。再也不用寫「fix bug」或「update stuff」。',
      'https://commitcraft.vercel.app',
      JSON.stringify(['開發','生產力','git']), '多語言', 'Bob', 0, 0);
    await db.run(ins,
      '冷郵件撰寫助手',
      '輸入目標對象職稱與你的訴求，AI 幫你寫出有鉤子、有個人化、有 CTA 的開發信。根據 A/B 測試資料調整語氣，回覆率平均從 2% 提升到 15%+。',
      'https://coldemailcrafter.vercel.app',
      JSON.stringify(['業務','寫作','行銷']), '中文', 'Alice', 15, 1);
    await db.run(ins,
      'SQL 白話解釋器',
      '貼入任何複雜的 SQL 查詢，AI 逐段說明邏輯、指出潛在效能問題，並建議可優化的索引策略。學 SQL 或讀別人程式碼都好用，支援 MySQL / PostgreSQL / SQLite。',
      'https://sqlwhisperer.vercel.app',
      JSON.stringify(['開發','資料庫','學習']), '英文', 'Charlie', 5, 0);
    await db.run(ins,
      '落地頁健診',
      '輸入落地頁網址，AI 從文案力、視覺動線、行動呼籲三個面向給出可直接套用的改善建議，幫你找出悄悄吃掉轉換率的設計問題。',
      'https://lpaudit.vercel.app',
      JSON.stringify(['行銷','ai','轉換率']), '中文', 'Bob', 20, 1);
    await db.run(ins,
      '正規表達式生成器',
      '用白話文描述你要匹配的規則，AI 幫你生成 Regex 並附上詳細說明與真實測試案例。支援 JavaScript / Python / Go 語法，告別對著文件瞎猜的痛苦。',
      'https://regexcraft.vercel.app',
      JSON.stringify(['開發','工具','生產力']), '多語言', 'Dana', 0, 0);
    await db.run(ins,
      '面試題模擬器',
      '輸入職位描述與公司名稱，AI 根據該職位常見考題生成專屬題庫，並提供 STAR 框架範例答案。技術題、行為題都有，上場前刷一輪信心大增。',
      'https://interviewprepai.vercel.app',
      JSON.stringify(['求職','ai','面試']), '中文', 'Charlie', 8, 0);
    await db.run(ins,
      '翻譯潤稿助手',
      '不只是翻譯，而是讓文字真的讀起來像母語者寫的。中英互譯時自動調整語氣、慣用語和文化適配性，適合部落格文章、產品說明、社群貼文。',
      'https://translationpolish.vercel.app',
      JSON.stringify(['寫作','翻譯','生產力']), '多語言', 'Eve', 0, 0);

    // Seed realistic usage counts
    await db.run(`UPDATE tools SET usage_count = 143, points_earned = 1430 WHERE id = 1`);
    await db.run(`UPDATE tools SET usage_count = 89  WHERE id = 2`);
    await db.run(`UPDATE tools SET usage_count = 67, points_earned = 1005 WHERE id = 3`);
    await db.run(`UPDATE tools SET usage_count = 54, points_earned = 270  WHERE id = 4`);
    await db.run(`UPDATE tools SET usage_count = 38, points_earned = 760  WHERE id = 5`);
    await db.run(`UPDATE tools SET usage_count = 112 WHERE id = 6`);
    await db.run(`UPDATE tools SET usage_count = 29, points_earned = 232  WHERE id = 7`);
    await db.run(`UPDATE tools SET usage_count = 76  WHERE id = 8`);

    // Seed ratings
    const rIns = `INSERT INTO ratings (tool_id, stars, created_at) VALUES (?, ?, unixepoch() - ?)`;
    for (const [id, stars, ago] of [
      [1,5,86400*9],[1,5,86400*7],[1,4,86400*5],[1,5,86400*3],[1,4,86400*1],
      [2,4,86400*6],[2,4,86400*2],
      [3,5,86400*8],[3,4,86400*5],[3,5,86400*2],[3,4,86400*1],
      [4,4,86400*7],[4,3,86400*3],[4,4,86400*1],
      [5,5,86400*10],[5,4,86400*7],[5,3,86400*4],[5,5,86400*2],[5,4,86400*1],
      [6,5,86400*5],[6,5,86400*3],[6,4,86400*1],
      [7,4,86400*4],[7,5,86400*2],
      [8,4,86400*6],[8,5,86400*3],[8,4,86400*1],
    ]) { await db.run(rIns, [id, stars, ago]); }

    // Seed comments
    const cIns = `INSERT INTO comments (tool_id, body, created_at) VALUES (?, ?, unixepoch() - ?)`;
    for (const [id, body, ago] of [
      [1, '改了三個地方之後，面試邀約多了一倍，真的有效！', 86400*4],
      [1, '本來以為履歷還不錯，結果被找出 5 個問題⋯⋯原來 HR 看的角度跟我完全不同', 86400*2],
      [2, '終於可以告別 "wip" 這種 commit 訊息了，同事看 git log 再也不罵我了', 86400*5],
      [3, '用了三封之後有一家公司真的回覆了，之前用自己寫的完全沒消息', 86400*3],
      [4, '工作上接手舊系統，有幾段 JOIN 寫得很詭異，靠這個搞懂了邏輯', 86400*2],
      [4, '順便找到一個沒有加 index 的查詢，效能直接從 3 秒降到 0.2 秒', 86400*1],
      [5, 'CTA 按鈕位置建議往上移，試了之後轉換率真的有提升', 86400*2],
      [6, '以前要花 20 分鐘查文件，現在 30 秒搞定，而且還附說明超貼心', 86400*3],
      [7, '面試前刷了一輪，問題跟實際面試重疊了 60% 左右，超準', 86400*2],
      [8, '翻出來的英文終於不會讓外國人看了有點怪，自然多了', 86400*4],
    ]) { await db.run(cIns, [id, body, ago]); }
  }

  return db;
}

function generateEditToken() {
  const token = crypto.randomBytes(32).toString('hex');
  const hash  = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

module.exports = { getDb, generateEditToken, hashToken };
