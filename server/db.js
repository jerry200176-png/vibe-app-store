const { open } = require('sqlite');
const sqlite3  = require('sqlite3');
const path     = require('path');
const fs       = require('fs');

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
  `);

  await db.exec(`CREATE INDEX IF NOT EXISTS idx_usage_log_tool_time ON usage_log(tool_id, created_at);`);

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

  // Seed initial tools if empty
  const { n } = await db.get('SELECT COUNT(*) as n FROM tools');
  if (n === 0) {
    const ins = `INSERT INTO tools (title, desc, url, tags, lang, creator_name, cost, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    await db.run(ins, '履歷健診 AI',      '貼上你的履歷，立即獲得犀利的 AI 改善建議，讓你的履歷脫穎而出。',   'https://resume-roaster.vercel.app', JSON.stringify(['求職','ai']),     '中文', 'Alice',     10, 1);
    await db.run(ins, 'Commit 訊息產生器', '從你的 git diff 自動產生完美的 commit 訊息，告別寫 "fix bug"。',   'https://commitai.dev',              JSON.stringify(['開發','生產力']), '多語言', 'Bob',       0,  0);
    await db.run(ins, '開發提案信撰寫器',  '用 AI 寫出真的會被回覆的開發合作提案信，轉換率大幅提升。',          'https://coldemailcrafter.com',      JSON.stringify(['業務','寫作']),   '中文', 'Alice',     15, 1);
    await db.run(ins, 'SQL 白話解釋器',    '貼上任何 SQL 查詢，立即獲得白話文說明，學 SQL 再也不頭痛。',        'https://sqlexplainer.app',          JSON.stringify(['開發','資料庫']), '英文', 'Charlie',    5, 0);
    await db.run(ins, '落地頁健診',        'AI 幫你分析落地頁的文案與結構問題，找出轉換率殺手。',               'https://lpcritic.com',              JSON.stringify(['行銷','ai']),     '中文', 'Bob',       20, 1);
  }

  return db;
}

module.exports = { getDb };
