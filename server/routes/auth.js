const express  = require('express');
const bcrypt   = require('bcryptjs');
const router   = express.Router();
const { getDb } = require('../db');
const { sendServerError } = require('../util/httpError');
const { COOKIE_NAME, cookieOptions, signToken, requireUser } = require('../middleware/auth');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SALT_ROUNDS = 10;

router.post('/register', async (req, res) => {
  try {
    const { email, password, display_name } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanName  = String(display_name || '').trim();

    if (!EMAIL_RE.test(cleanEmail))
      return res.status(400).json({ error: '請輸入有效的 Email' });
    if (!password || password.length < 8)
      return res.status(400).json({ error: '密碼至少需要 8 個字元' });
    if (!cleanName || cleanName.length < 1 || cleanName.length > 40)
      return res.status(400).json({ error: '顯示名稱為 1–40 字' });

    const db = await getDb();
    const existing = await db.get('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing) return res.status(409).json({ error: '此 Email 已被註冊' });

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const { lastID } = await db.run(
      'INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)',
      [cleanEmail, hash, cleanName.slice(0, 40)]
    );

    const token = signToken(lastID);
    res.cookie(COOKIE_NAME, token, cookieOptions());
    res.status(201).json({ id: lastID, email: cleanEmail, display_name: cleanName });
  } catch (e) { sendServerError(res, e); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !password)
      return res.status(400).json({ error: '請輸入 Email 和密碼' });

    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE email = ?', [cleanEmail]);
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ error: '帳號或密碼錯誤' });

    const token = signToken(user.id);
    res.cookie(COOKIE_NAME, token, cookieOptions());
    res.json({ id: user.id, email: user.email, display_name: user.display_name });
  } catch (e) { sendServerError(res, e); }
});

router.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

router.get('/me', requireUser, async (req, res) => {
  try {
    const db   = await getDb();
    const user = await db.get('SELECT id, email, display_name, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(401).json({ error: '使用者不存在' });
    res.json(user);
  } catch (e) { sendServerError(res, e); }
});

module.exports = router;
