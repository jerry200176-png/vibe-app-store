const express   = require('express');
const router    = express.Router();
const { getDb, generateEditToken, hashToken } = require('../db');
const { sendServerError } = require('../util/httpError');
const { requireUser, optionalUser } = require('../middleware/auth');

const BASE_AGG = `
  SELECT t.id, t.title, t.desc, t.url, t.tags, t.lang, t.created_at,
    t.creator_name, t.cost, t.usage_count, t.points_earned, t.is_featured,
    t.status, t.reviewed_at,
    ROUND(AVG(r.stars), 1) as avg_rating,
    COUNT(DISTINCT r.id)   as rating_count,
    COUNT(DISTINCT c.id)   as comment_count,
    (SELECT COUNT(*) FROM violations v WHERE LOWER(v.creator_name) = LOWER(t.creator_name)) as strike_count
  FROM tools t
  LEFT JOIN ratings  r ON r.tool_id = t.id
  LEFT JOIN comments c ON c.tool_id = t.id
`;

const SORT_MODES = { newest: true, top: true, trending: true };

function parse(t) {
  t.tags          = JSON.parse(t.tags || '[]');
  t.avg_rating    = t.avg_rating    || 0;
  t.rating_count  = t.rating_count  || 0;
  t.comment_count = t.comment_count || 0;
  t.is_featured   = !!t.is_featured;
  t.strike_count  = t.strike_count  || 0;
  t.badges        = [];
  if (t.status === 'active' && t.reviewed_at) t.badges.push('reviewed');
  if (t.strike_count === 0 && t.reviewed_at)  t.badges.push('trusted');
  return t;
}

function escapeLikeFragment(s) {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/"/g, '');
}

router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const sortRaw = req.query.sort;
    const sort = SORT_MODES[sortRaw] ? sortRaw : 'newest';
    const { tag, creator, since_days } = req.query;
    const where = [`t.status = 'active'`];
    const args  = [];

    if (tag && String(tag).trim()) {
      const frag = escapeLikeFragment(String(tag).trim());
      if (frag.length) {
        where.push(`t.tags LIKE ? ESCAPE '\\'`);
        args.push(`%"${frag}"%`);
      }
    }
    if (creator && String(creator).trim()) {
      where.push(`LOWER(t.creator_name) = ?`);
      args.push(String(creator).trim().toLowerCase().slice(0, 100));
    }
    if (since_days) {
      const days = Math.min(Math.max(parseInt(since_days, 10) || 0, 1), 90);
      where.push(`t.created_at >= unixepoch() - (? * 86400)`);
      args.push(days);
    }

    let sql = BASE_AGG;
    sql += ` WHERE ${where.join(' AND ')}`;
    sql += ` GROUP BY t.id`;

    if (sort === 'trending') {
      sql = `
        SELECT sub.*, COALESCE(recent.cnt, 0) as recent_uses
        FROM (${sql}) sub
        LEFT JOIN (
          SELECT tool_id, COUNT(*) as cnt
          FROM usage_log
          WHERE created_at >= unixepoch() - 604800
          GROUP BY tool_id
        ) recent ON recent.tool_id = sub.id
        ORDER BY
          COALESCE(recent.cnt, 0) * 3
          + COALESCE(sub.avg_rating, 0) * (1 + ln(1 + sub.rating_count))
          DESC
      `;
    } else if (sort === 'top') {
      sql += ` ORDER BY avg_rating DESC, rating_count DESC`;
    } else {
      sql += ` ORDER BY t.created_at DESC`;
    }

    const rows = await db.all(sql, args);
    res.json(rows.map(parse));
  } catch (e) { sendServerError(res, e); }
});

router.post('/:id/use', async (req, res) => {
  try {
    const db     = await getDb();
    const toolId = Number(req.params.id);
    const tool   = await db.get(`SELECT id, cost, status FROM tools WHERE id = ? AND status = 'active'`, [toolId]);
    if (!tool) return res.status(404).json({ error: '找不到此工具' });

    await db.run('BEGIN IMMEDIATE');
    try {
      await db.run('INSERT INTO usage_log (tool_id) VALUES (?)', [toolId]);
      if (tool.cost > 0) {
        await db.run('UPDATE tools SET usage_count = usage_count + 1, points_earned = points_earned + cost WHERE id = ?', [toolId]);
      } else {
        await db.run('UPDATE tools SET usage_count = usage_count + 1 WHERE id = ?', [toolId]);
      }
      await db.run('COMMIT');
    } catch (txErr) {
      await db.run('ROLLBACK').catch(() => {});
      throw txErr;
    }

    const updated = await db.get('SELECT usage_count, points_earned, cost FROM tools WHERE id = ?', [toolId]);
    res.status(201).json(updated);
  } catch (e) { sendServerError(res, e); }
});

router.post('/', requireUser, async (req, res) => {
  try {
    const db = await getDb();
    const user = await db.get('SELECT id, display_name FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(401).json({ error: '使用者不存在' });

    const { title, desc, url, tags = [], lang = '中文', cost } = req.body || {};
    if (!title?.trim() || !desc?.trim() || !url?.trim())
      return res.status(400).json({ error: '名稱、描述、網址為必填' });
    try {
      const u = new URL(url.trim());
      if (!['http:', 'https:'].includes(u.protocol)) throw new Error();
    } catch { return res.status(400).json({ error: '請輸入有效的 http/https 網址' }); }

    const cleanTags = (Array.isArray(tags) ? tags : String(tags).split(','))
      .map(t => t.trim()).filter(Boolean).slice(0, 5);
    const safeCost = Math.max(0, Math.min(100, parseInt(cost, 10) || 0));

    const { lastID } = await db.run(
      `INSERT INTO tools (title, desc, url, tags, lang, creator_name, cost, status, owner_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [title.trim().slice(0,80), desc.trim().slice(0,300), url.trim(),
       JSON.stringify(cleanTags), String(lang).trim().slice(0,20),
       user.display_name.slice(0,40), safeCost, user.id]
    );
    const tool = await db.get(`${BASE_AGG} WHERE t.id = ? GROUP BY t.id`, [lastID]);
    res.status(201).json(parse(tool));
  } catch (e) { sendServerError(res, e); }
});

/* ── Ownership check: logged-in owner OR legacy edit_token ── */
async function verifyOwnership(req, res) {
  const db     = await getDb();
  const toolId = Number(req.params.id);
  const tool   = await db.get('SELECT id, owner_user_id, edit_token_hash FROM tools WHERE id = ?', [toolId]);
  if (!tool) { res.status(404).json({ error: '找不到此工具' }); return null; }

  if (req.user && tool.owner_user_id && req.user.id === tool.owner_user_id) return tool;

  const token = req.headers['x-edit-token'];
  if (token && tool.edit_token_hash && tool.edit_token_hash === hashToken(token)) return tool;

  res.status(403).json({ error: '你沒有權限編輯此工具' });
  return null;
}

/* ── Edit tool ───────────────────────────────────────────── */
router.put('/:id', optionalUser, async (req, res) => {
  try {
    const tool = await verifyOwnership(req, res);
    if (!tool) return;

    const db = await getDb();
    const { title, desc, url, tags, lang, cost } = req.body || {};
    const sets = [];
    const args = [];

    if (title?.trim())        { sets.push('title = ?'); args.push(title.trim().slice(0,80)); }
    if (desc?.trim())         { sets.push('desc = ?');  args.push(desc.trim().slice(0,300)); }
    if (url?.trim()) {
      try {
        const u = new URL(url.trim());
        if (!['http:', 'https:'].includes(u.protocol)) throw new Error();
        sets.push('url = ?'); args.push(url.trim());
      } catch { return res.status(400).json({ error: '請輸入有效的 http/https 網址' }); }
    }
    if (tags !== undefined) {
      const cleanTags = (Array.isArray(tags) ? tags : String(tags).split(','))
        .map(t => t.trim()).filter(Boolean).slice(0, 5);
      sets.push('tags = ?'); args.push(JSON.stringify(cleanTags));
    }
    if (lang) { sets.push('lang = ?'); args.push(String(lang).trim().slice(0,20)); }
    if (cost !== undefined) {
      sets.push('cost = ?'); args.push(Math.max(0, Math.min(100, parseInt(cost, 10) || 0)));
    }

    if (sets.length === 0)
      return res.status(400).json({ error: '未提供任何更新欄位' });

    args.push(tool.id);
    await db.run(`UPDATE tools SET ${sets.join(', ')} WHERE id = ?`, args);

    const updated = await db.get(`${BASE_AGG} WHERE t.id = ? GROUP BY t.id`, [tool.id]);
    res.json(parse(updated));
  } catch (e) { sendServerError(res, e); }
});

/* ── Delete tool ─────────────────────────────────────────── */
router.delete('/:id', optionalUser, async (req, res) => {
  try {
    const tool = await verifyOwnership(req, res);
    if (!tool) return;

    const db = await getDb();
    await db.run(`UPDATE tools SET status = 'removed' WHERE id = ?`, [tool.id]);
    res.json({ message: '工具已刪除' });
  } catch (e) { sendServerError(res, e); }
});

/* ── My tools (logged-in user) ────────────────────────────── */
router.get('/me', requireUser, async (req, res) => {
  try {
    const db   = await getDb();
    const rows = await db.all(
      `${BASE_AGG} WHERE t.owner_user_id = ? GROUP BY t.id ORDER BY t.created_at DESC`,
      [req.user.id]
    );
    res.json(rows.map(parse));
  } catch (e) { sendServerError(res, e); }
});

module.exports = router;
