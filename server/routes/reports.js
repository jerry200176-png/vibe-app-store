const express   = require('express');
const router    = express.Router();
const { getDb } = require('../db');
const { sendServerError } = require('../util/httpError');

const VALID_TARGETS = ['tool', 'comment'];
const VALID_REASONS = [
  'spam',
  'malware',
  'impersonation',
  'inappropriate',
  'broken_link',
  'other',
];

router.post('/', async (req, res) => {
  try {
    const db = await getDb();
    const { target_type, target_id, reason, detail } = req.body || {};

    if (!VALID_TARGETS.includes(target_type))
      return res.status(400).json({ error: '無效的檢舉對象類型' });
    if (!Number.isInteger(Number(target_id)) || Number(target_id) < 1)
      return res.status(400).json({ error: '無效的檢舉對象 ID' });
    if (!VALID_REASONS.includes(reason))
      return res.status(400).json({ error: '請選擇檢舉原因' });

    const table = target_type === 'tool' ? 'tools' : 'comments';
    const exists = await db.get(`SELECT id FROM ${table} WHERE id = ?`, [Number(target_id)]);
    if (!exists) return res.status(404).json({ error: '檢舉對象不存在' });

    const safeDetail = String(detail || '').trim().slice(0, 500);
    const { lastID } = await db.run(
      `INSERT INTO reports (target_type, target_id, reason, detail) VALUES (?, ?, ?, ?)`,
      [target_type, Number(target_id), reason, safeDetail]
    );
    res.status(201).json({ id: lastID, message: '檢舉已送出，我們會儘快處理。' });
  } catch (e) { sendServerError(res, e); }
});

module.exports = router;
