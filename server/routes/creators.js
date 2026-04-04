const express   = require('express');
const router    = express.Router();
const { getDb } = require('../db');
const { sendServerError } = require('../util/httpError');

router.get('/stats', async (req, res) => {
  try {
    const name = req.query.name?.trim();
    if (!name) return res.status(400).json({ error: '請提供 name 參數' });

    const db = await getDb();
    const tools = await db.all(
      `SELECT id, title, cost, usage_count, points_earned FROM tools WHERE LOWER(creator_name) = ?`,
      [name.toLowerCase().slice(0, 100)]
    );

    if (tools.length === 0) return res.status(404).json({ error: '找不到此創作者的工具' });

    const total_uses          = tools.reduce((s, t) => s + t.usage_count, 0);
    const total_points_earned = tools.reduce((s, t) => s + t.points_earned, 0);

    res.json({ creator_name: name, tools, total_uses, total_points_earned });
  } catch (e) { sendServerError(res, e); }
});

module.exports = router;
