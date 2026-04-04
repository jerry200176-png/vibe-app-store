const express   = require('express');
const router    = express.Router();
const { getDb } = require('../db');

const AGG = `
  SELECT t.id, t.title, t.desc, t.url, t.tags, t.lang, t.created_at,
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
  return t;
}

// GET /api/tools?sort=newest|top&tag=xxx
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const { sort = 'newest', tag } = req.query;
    let sql = AGG, args = [];
    if (tag) { sql += ` WHERE t.tags LIKE ?`; args.push(`%"${tag}"%`); }
    sql += ` GROUP BY t.id`;
    sql += sort === 'top'
      ? ` ORDER BY avg_rating DESC, rating_count DESC`
      : ` ORDER BY t.created_at DESC`;
    const rows = await db.all(sql, args);
    res.json(rows.map(parse));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/tools
router.post('/', async (req, res) => {
  try {
    const db = await getDb();
    const { title, desc, url, tags = [], lang = '中文' } = req.body || {};
    if (!title?.trim() || !desc?.trim() || !url?.trim())
      return res.status(400).json({ error: '名稱、描述、網址為必填' });
    try {
      const u = new URL(url.trim());
      if (!['http:', 'https:'].includes(u.protocol)) throw new Error();
    } catch { return res.status(400).json({ error: '請輸入有效的 http/https 網址' }); }

    const cleanTags = (Array.isArray(tags) ? tags : String(tags).split(','))
      .map(t => t.trim()).filter(Boolean).slice(0, 5);

    const { lastID } = await db.run(
      `INSERT INTO tools (title, desc, url, tags, lang) VALUES (?, ?, ?, ?, ?)`,
      [title.trim().slice(0,80), desc.trim().slice(0,300), url.trim(), JSON.stringify(cleanTags), String(lang).trim().slice(0,20)]
    );
    const tool = await db.get(`${AGG} WHERE t.id = ? GROUP BY t.id`, [lastID]);
    res.status(201).json(parse(tool));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
