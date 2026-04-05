const express    = require('express');
const router     = express.Router();
const { getDb }  = require('../db');
const { requireUser } = require('../middleware/auth');
const { sendServerError } = require('../util/httpError');

router.get('/', requireUser, async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(
      `SELECT id, type, tool_id, tool_title, detail, is_read, created_at
       FROM notifications WHERE user_id = ?
       ORDER BY created_at DESC LIMIT 20`,
      [req.user.id]
    );
    res.json(rows);
  } catch (e) { sendServerError(res, e); }
});

router.patch('/read-all', requireUser, async (req, res) => {
  try {
    const db = await getDb();
    await db.run(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`, [req.user.id]);
    res.json({ ok: true });
  } catch (e) { sendServerError(res, e); }
});

module.exports = router;
