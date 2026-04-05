const { Router } = require('express');
const { getDb }  = require('../db');
const router     = Router();

function escXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const tools = await db.all(
      `SELECT id, title, desc, url, tags, creator_name, created_at
       FROM tools WHERE status = 'active'
       ORDER BY created_at DESC LIMIT 30`
    );

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const items = tools.map((t) => {
      const date = new Date(t.created_at * 1000).toUTCString();
      const tags = JSON.parse(t.tags || '[]');
      const cats = tags.map((tag) => `<category>${escXml(tag)}</category>`).join('');
      return `<item>
  <title>${escXml(t.title)}</title>
  <link>${escXml(baseUrl)}/?tool=${t.id}</link>
  <description>${escXml(t.desc)}</description>
  <author>${escXml(t.creator_name)}</author>
  <pubDate>${date}</pubDate>
  <guid isPermaLink="false">tool-${t.id}</guid>
  ${cats}
</item>`;
    }).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Vibe App Store — 最新 AI 工具</title>
  <link>${escXml(baseUrl)}</link>
  <description>亞洲中文社群的 AI 工具目錄，審核上架的最新工具</description>
  <language>zh-TW</language>
  <atom:link href="${escXml(baseUrl)}/api/feed.xml" rel="self" type="application/rss+xml"/>
${items}
</channel>
</rss>`;

    res.set('Content-Type', 'application/rss+xml; charset=utf-8');
    res.send(xml);
  } catch (e) {
    res.status(500).set('Content-Type', 'text/plain').send('Feed generation error');
  }
});

module.exports = router;
