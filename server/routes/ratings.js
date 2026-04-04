const express   = require('express');
const router    = express.Router({ mergeParams: true });
const { getDb } = require('../db');
const { sendServerError } = require('../util/httpError');

router.post('/', async (req, res) => {
  try {
    const db     = await getDb();
    const toolId = Number(req.params.toolId);
    const stars  = Number(req.body?.stars);
    if (!Number.isInteger(stars) || stars < 1 || stars > 5)
      return res.status(400).json({ error: '評分必須是 1 到 5 的整數' });
    if (!await db.get('SELECT id FROM tools WHERE id = ?', [toolId]))
      return res.status(404).json({ error: '找不到此工具' });
    await db.run('INSERT INTO ratings (tool_id, stars) VALUES (?, ?)', [toolId, stars]);
    const agg = await db.get(
      `SELECT ROUND(AVG(stars),1) as avg_rating, COUNT(*) as rating_count FROM ratings WHERE tool_id = ?`,
      [toolId]
    );
    res.status(201).json(agg);
  } catch (e) { sendServerError(res, e); }
});

module.exports = router;
