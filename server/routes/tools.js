const express   = require('express');
const router    = express.Router();
const { getDb } = require('../db');

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

function parse(t) {
  t.tags          = JSON.parse(t.tags || '[]');
  t.avg_rating    = t.avg_rating    || 0;
  t.rating_count  = t.rating_count  || 0;
  t.comment_count = t.comment_count || 0;
  t.is_featured   = !!t.is_featured;
  return t;
}

// GET /api/tools?sort=newest|top|trending&tag=xxx&creator=xxx
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const { sort = 'newest', tag, creator } = req.query;
    const where = [];
    const args  = [];

    if (tag)     { where.push(`t.tags LIKE ?`);              args.push(`%"${tag}"%`); }
    if (creator) { where.push(`LOWER(t.creator_name) = ?`);  args.push(creator.trim().toLowerCase()); }

    let sql = BASE_AGG;
    if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
    sql += ` GROUP BY t.id`;

    if (sort === 'trending') {
      // Simple score: recent_7d_uses * 3 + avg_rating * ln(1 + rating_count)
      // We use a correlated subquery for the 7-day usage count.
      sql = `
        SELECT sub.*,
          (COALESCE((SELECT COUNT(*) FROM usage_log u WHERE u.tool_id = sub.id AND u.created_at >= unixepoch() - 604800), 0)) as recent_uses
        FROM (${sql}) sub
        ORDER BY
          (COALESCE((SELECT COUNT(*) FROM usage_log u WHERE u.tool_id = sub.id AND u.created_at >= unixepoch() - 604800), 0)) * 3
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
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/tools/:id/use  — record a usage event
router.post('/:id/use', async (req, res) => {
  try {
    const db     = await getDb();
    const toolId = Number(req.params.id);
    const tool   = await db.get('SELECT id, cost FROM tools WHERE id = ?', [toolId]);
    if (!tool) return res.status(404).json({ error: '找不到此工具' });

    await db.run('INSERT INTO usage_log (tool_id) VALUES (?)', [toolId]);

    if (tool.cost > 0) {
      await db.run('UPDATE tools SET usage_count = usage_count + 1, points_earned = points_earned + cost WHERE id = ?', [toolId]);
    } else {
      await db.run('UPDATE tools SET usage_count = usage_count + 1 WHERE id = ?', [toolId]);
    }

    const updated = await db.get('SELECT usage_count, points_earned, cost FROM tools WHERE id = ?', [toolId]);
    res.status(201).json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/tools
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
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
