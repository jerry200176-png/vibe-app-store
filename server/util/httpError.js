/**
 * Avoid leaking stack/SQLite paths in production; always log server-side.
 */
function sendServerError(res, err) {
  console.error(err);
  const safe =
    process.env.NODE_ENV === 'production'
      ? '伺服器發生錯誤，請稍後再試。'
      : (err && err.message) || String(err);
  res.status(500).json({ error: safe });
}

module.exports = { sendServerError };
