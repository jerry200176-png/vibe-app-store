const express   = require('express');
const router    = express.Router();
const { getDb } = require('../db');
const { sendServerError } = require('../util/httpError');

const BASE_AGG = `
  SELECT t.id, t.title, t.desc, t.url, t.tags, t.lang, t.created_at,
    t.creator_name, t.cost, t.usage_count, t.points_earned, t.is_featured,
    ROUND(AVG(r.stars), 1) as avg_rating,
    COUNT(DISTINCT r.id)   as rating_count,
    COUNT(DISTINCT c.id)   as comment_count
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
    const { tag, creator } = req.query;
    const where = [];
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

    let sql = BASE_AGG;
    if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
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
    const tool   = await db.get('SELECT id, cost FROM tools WHERE id = ?', [toolId]);
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

router.post('/', async (req, res) => {
  try {
    const db = await getDb();
    const { title, desc, url, tags = [], lang = '中文', creator_name, cost } = req.body || {};
    if (!title?.trim() || !desc?.trim() || !url?.trim())
      return res.status(400).json({ error: '名稱、描述、網址為必填' });
    if (!creator_name?.trim())
      return res.status(400).json({ error: '創作者名稱為必填' });
    try {
      const u = new URL(url.trim());
      if (!['http:', 'https:'].includes(u.protocol)) throw new Error();
    } catch { return res.status(400).json({ error: '請輸入有效的 http/https 網址' }); }

    const cleanTags = (Array.isArray(tags) ? tags : String(tags).split(','))
      .map(t => t.trim()).filter(Boolean).slice(0, 5);
    const safeCost = Math.max(0, Math.min(100, parseInt(cost, 10) || 0));

    const { lastID } = await db.run(
      `INSERT INTO tools (title, desc, url, tags, lang, creator_name, cost) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title.trim().slice(0,80), desc.trim().slice(0,300), url.trim(), JSON.stringify(cleanTags), String(lang).trim().slice(0,20), creator_name.trim().slice(0,40), safeCost]
    );
    const tool = await db.get(`${BASE_AGG} WHERE t.id = ? GROUP BY t.id`, [lastID]);
    res.status(201).json(parse(tool));
  } catch (e) { sendServerError(res, e); }
});

module.exports = router;
