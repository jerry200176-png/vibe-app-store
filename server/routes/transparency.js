const express = require('express');
const router  = express.Router();
const { getDb } = require('../db');
const { sendServerError } = require('../util/httpError');

router.get('/summary', async (_req, res) => {
  try {
    const db = await getDb();
    const [active, pending, reports, violations] = await Promise.all([
      db.get(`SELECT COUNT(*) as n FROM tools WHERE status = 'active'`),
      db.get(`SELECT COUNT(*) as n FROM tools WHERE status = 'pending'`),
      db.get(`SELECT COUNT(*) as n FROM reports WHERE status = 'open'`),
      db.get(`SELECT COUNT(*) as n FROM violations`),
    ]);
    res.json({
      active_tools:     active.n,
      pending_tools:    pending.n,
      pending_reports:  reports.n,
      total_violations: violations.n,
    });
  } catch (e) { sendServerError(res, e); }
});

module.exports = router;
