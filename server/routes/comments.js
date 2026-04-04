const express   = require('express');
const router    = express.Router({ mergeParams: true });
const { getDb } = require('../db');
const { sendServerError } = require('../util/httpError');

router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(
      `SELECT id, body, created_at FROM comments WHERE tool_id = ? ORDER BY created_at DESC`,
      [Number(req.params.toolId)]
    );
    res.json(rows);
  } catch (e) { sendServerError(res, e); }
});

router.post('/', async (req, res) => {
  try {
    const db     = await getDb();
    const toolId = Number(req.params.toolId);
    const body   = req.body?.body?.trim()?.slice(0, 500);
    if (!body) return res.status(400).json({ error: '留言不能為空' });
    if (!await db.get('SELECT id FROM tools WHERE id = ?', [toolId]))
      return res.status(404).json({ error: '找不到此工具' });
    const { lastID } = await db.run(
      `INSERT INTO comments (tool_id, body) VALUES (?, ?)`, [toolId, body]
    );
    const comment = await db.get(
      `SELECT id, body, created_at FROM comments WHERE id = ?`, [lastID]
    );
    res.status(201).json(comment);
  } catch (e) { sendServerError(res, e); }
});

module.exports = router;
