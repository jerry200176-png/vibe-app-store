const { Router } = require('express');
const router = Router();

router.get('/contact', (_req, res) => {
  const email = process.env.SITE_CONTACT_EMAIL;
  if (!email) return res.json({ email: null });
  res.json({ email });
});

module.exports = router;
