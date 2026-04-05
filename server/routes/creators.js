const express   = require('express');
const router    = express.Router();
const { getDb } = require('../db');
const { sendServerError } = require('../util/httpError');
const { requireUser } = require('../middleware/auth');

router.get('/stats', async (req, res) => {
  try {
    const name = req.query.name?.trim();
    if (!name) return res.status(400).json({ error: '請提供 name 參數' });

    const db = await getDb();
    const tools = await db.all(
      `SELECT id, title, cost, usage_count, points_earned, status, is_featured, created_at
       FROM tools WHERE LOWER(creator_name) = ?`,
      [name.toLowerCase().slice(0, 100)]
    );

    if (tools.length === 0) return res.status(404).json({ error: '找不到此創作者的工具' });

    const toolIds = tools.map(t => t.id);
    const placeholders = toolIds.map(() => '?').join(',');

    const [recent7, recent28, ratings, strikeRow] = await Promise.all([
      db.all(
        `SELECT tool_id, COUNT(*) as cnt FROM usage_log
         WHERE tool_id IN (${placeholders}) AND created_at >= unixepoch() - 604800
         GROUP BY tool_id`, toolIds),
      db.all(
        `SELECT tool_id, COUNT(*) as cnt FROM usage_log
         WHERE tool_id IN (${placeholders}) AND created_at >= unixepoch() - 2419200
         GROUP BY tool_id`, toolIds),
      db.all(
        `SELECT tool_id, ROUND(AVG(stars),1) as avg, COUNT(*) as cnt FROM ratings
         WHERE tool_id IN (${placeholders}) GROUP BY tool_id`, toolIds),
      db.get(
        `SELECT COUNT(*) as n FROM violations WHERE LOWER(creator_name) = ?`,
        [name.toLowerCase()]),
    ]);

    const r7map  = Object.fromEntries(recent7.map(r => [r.tool_id, r.cnt]));
    const r28map = Object.fromEntries(recent28.map(r => [r.tool_id, r.cnt]));
    const rMap   = Object.fromEntries(ratings.map(r => [r.tool_id, { avg: r.avg, count: r.cnt }]));

    const enriched = tools.map(t => ({
      ...t,
      uses_7d:      r7map[t.id]  || 0,
      uses_28d:     r28map[t.id] || 0,
      avg_rating:   rMap[t.id]?.avg   || 0,
      rating_count: rMap[t.id]?.count || 0,
      is_featured:  !!t.is_featured,
    }));

    const total_uses          = tools.reduce((s, t) => s + t.usage_count, 0);
    const total_points_earned = tools.reduce((s, t) => s + t.points_earned, 0);
    const strikes             = strikeRow.n;

    const featured_eligible = tools.some(t => t.status === 'active') &&
      strikes === 0 &&
      enriched.some(t => t.avg_rating >= 3 && t.rating_count >= 2);

    res.json({
      creator_name: name,
      tools: enriched,
      total_uses,
      total_points_earned,
      strikes,
      featured_eligible,
    });
  } catch (e) { sendServerError(res, e); }
});

router.get('/me', requireUser, async (req, res) => {
  try {
    const db = await getDb();
    const user = await db.get('SELECT id, display_name FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(401).json({ error: '使用者不存在' });

    const tools = await db.all(
      `SELECT id, title, cost, usage_count, points_earned, status, is_featured, created_at
       FROM tools WHERE owner_user_id = ?`,
      [user.id]
    );

    if (tools.length === 0)
      return res.json({ creator_name: user.display_name, tools: [], total_uses: 0, total_points_earned: 0, strikes: 0, featured_eligible: false });

    const toolIds = tools.map(t => t.id);
    const placeholders = toolIds.map(() => '?').join(',');

    const [recent7, recent28, ratings, strikeRow] = await Promise.all([
      db.all(
        `SELECT tool_id, COUNT(*) as cnt FROM usage_log
         WHERE tool_id IN (${placeholders}) AND created_at >= unixepoch() - 604800
         GROUP BY tool_id`, toolIds),
      db.all(
        `SELECT tool_id, COUNT(*) as cnt FROM usage_log
         WHERE tool_id IN (${placeholders}) AND created_at >= unixepoch() - 2419200
         GROUP BY tool_id`, toolIds),
      db.all(
        `SELECT tool_id, ROUND(AVG(stars),1) as avg, COUNT(*) as cnt FROM ratings
         WHERE tool_id IN (${placeholders}) GROUP BY tool_id`, toolIds),
      db.get(
        `SELECT COUNT(*) as n FROM violations WHERE LOWER(creator_name) = ?`,
        [user.display_name.toLowerCase()]),
    ]);

    const r7map  = Object.fromEntries(recent7.map(r => [r.tool_id, r.cnt]));
    const r28map = Object.fromEntries(recent28.map(r => [r.tool_id, r.cnt]));
    const rMap   = Object.fromEntries(ratings.map(r => [r.tool_id, { avg: r.avg, count: r.cnt }]));

    const enriched = tools.map(t => ({
      ...t,
      uses_7d:      r7map[t.id]  || 0,
      uses_28d:     r28map[t.id] || 0,
      avg_rating:   rMap[t.id]?.avg   || 0,
      rating_count: rMap[t.id]?.count || 0,
      is_featured:  !!t.is_featured,
    }));

    const total_uses          = tools.reduce((s, t) => s + t.usage_count, 0);
    const total_points_earned = tools.reduce((s, t) => s + t.points_earned, 0);
    const strikes             = strikeRow.n;

    const featured_eligible = tools.some(t => t.status === 'active') &&
      strikes === 0 &&
      enriched.some(t => t.avg_rating >= 3 && t.rating_count >= 2);

    res.json({
      creator_name: user.display_name,
      tools: enriched,
      total_uses,
      total_points_earned,
      strikes,
      featured_eligible,
    });
  } catch (e) { sendServerError(res, e); }
});

module.exports = router;
