const express   = require('express');
const router    = express.Router();
const { getDb } = require('../db');
const { sendServerError } = require('../util/httpError');

function adminAuth(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY)
    return res.status(401).json({ error: '未授權' });
  next();
}

router.use(adminAuth);

/* ── Dashboard stats ──────────────────────────────────── */
router.get('/stats', async (_req, res) => {
  try {
    const db = await getDb();
    const [pending, reports, violations, totalTools] = await Promise.all([
      db.get(`SELECT COUNT(*) as n FROM tools WHERE status = 'pending'`),
      db.get(`SELECT COUNT(*) as n FROM reports WHERE status = 'pending'`),
      db.get(`SELECT COUNT(*) as n FROM violations`),
      db.get(`SELECT COUNT(*) as n FROM tools`),
    ]);
    res.json({
      pending_tools:    pending.n,
      pending_reports:  reports.n,
      total_violations: violations.n,
      total_tools:      totalTools.n,
    });
  } catch (e) { sendServerError(res, e); }
});

/* ── Pending tools ────────────────────────────────────── */
router.get('/tools/pending', async (_req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(
      `SELECT id, title, desc, url, tags, lang, creator_name, cost, status, created_at
       FROM tools WHERE status = 'pending' ORDER BY created_at ASC`
    );
    rows.forEach(r => { r.tags = JSON.parse(r.tags || '[]'); });
    res.json(rows);
  } catch (e) { sendServerError(res, e); }
});

/* ── Moderate a tool (approve / reject / remove) ──────── */
router.patch('/tools/:id', async (req, res) => {
  try {
    const db     = await getDb();
    const toolId = Number(req.params.id);
    const action = req.body?.action;
    const ACTIONS = { approve: 'active', reject: 'removed', remove: 'removed' };
    if (!ACTIONS[action])
      return res.status(400).json({ error: '動作必須為 approve / reject / remove' });

    const tool = await db.get('SELECT id, creator_name FROM tools WHERE id = ?', [toolId]);
    if (!tool) return res.status(404).json({ error: '找不到此工具' });

    const newStatus = ACTIONS[action];
    await db.run(
      `UPDATE tools SET status = ?, reviewed_at = unixepoch() WHERE id = ?`,
      [newStatus, toolId]
    );

    if (action === 'reject' || action === 'remove') {
      const reason = req.body?.reason || action;
      await db.run(
        `INSERT INTO violations (creator_name, tool_id, reason) VALUES (?, ?, ?)`,
        [tool.creator_name, toolId, String(reason).slice(0, 200)]
      );

      const { n } = await db.get(
        `SELECT COUNT(*) as n FROM violations WHERE LOWER(creator_name) = ?`,
        [tool.creator_name.toLowerCase()]
      );
      if (n >= 3) {
        await db.run(
          `UPDATE tools SET status = 'removed' WHERE LOWER(creator_name) = ? AND status != 'removed'`,
          [tool.creator_name.toLowerCase()]
        );
      }
    }

    res.json({ id: toolId, status: newStatus });
  } catch (e) { sendServerError(res, e); }
});

/* ── Pending reports ──────────────────────────────────── */
router.get('/reports', async (_req, res) => {
  try {
    const db   = await getDb();
    const rows = await db.all(
      `SELECT * FROM reports WHERE status = 'pending' ORDER BY created_at ASC`
    );
    res.json(rows);
  } catch (e) { sendServerError(res, e); }
});

/* ── Resolve / dismiss a report ───────────────────────── */
router.patch('/reports/:id', async (req, res) => {
  try {
    const db       = await getDb();
    const reportId = Number(req.params.id);
    const action   = req.body?.action;
    if (!['resolve', 'dismiss'].includes(action))
      return res.status(400).json({ error: '動作必須為 resolve / dismiss' });

    const report = await db.get('SELECT * FROM reports WHERE id = ?', [reportId]);
    if (!report) return res.status(404).json({ error: '找不到此檢舉' });

    const newStatus = action === 'resolve' ? 'resolved' : 'dismissed';
    await db.run(`UPDATE reports SET status = ? WHERE id = ?`, [newStatus, reportId]);
    res.json({ id: reportId, status: newStatus });
  } catch (e) { sendServerError(res, e); }
});

/* ── Violations list ──────────────────────────────────── */
router.get('/violations', async (_req, res) => {
  try {
    const db   = await getDb();
    const rows = await db.all(`SELECT * FROM violations ORDER BY created_at DESC LIMIT 100`);
    res.json(rows);
  } catch (e) { sendServerError(res, e); }
});

/* ── Violations by creator ────────────────────────────── */
router.get('/violations/:creator', async (req, res) => {
  try {
    const db   = await getDb();
    const name = req.params.creator.trim().toLowerCase();
    const rows = await db.all(
      `SELECT * FROM violations WHERE LOWER(creator_name) = ? ORDER BY created_at DESC`,
      [name]
    );
    res.json({ creator_name: req.params.creator, strikes: rows.length, violations: rows });
  } catch (e) { sendServerError(res, e); }
});

module.exports = router;
