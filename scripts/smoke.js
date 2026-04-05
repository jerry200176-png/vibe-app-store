const os = require('os');
const path = require('path');
const http = require('http');
const fs = require('fs');

const tmpDb = path.join(os.tmpdir(), `appstore-smoke-${Date.now()}.db`);
process.env.DB_PATH = tmpDb;
process.env.PORT = '0'; // let OS pick a free port

async function smoke() {
  const serverPromise = require('../server/index');
  const server = await serverPromise;

  const addr = server.address();
  const port = addr.port;

  const get = (urlPath) =>
    new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}${urlPath}`, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status: res.statusCode, body }));
      }).on('error', reject);
    });

  const health = await get('/api/health');
  if (health.status !== 200) throw new Error(`/api/health → ${health.status}`);
  const hJson = JSON.parse(health.body);
  if (!hJson.ok) throw new Error('/api/health did not return { ok: true }');

  const tools = await get('/api/tools');
  if (tools.status !== 200) throw new Error(`/api/tools → ${tools.status}`);
  const tJson = JSON.parse(tools.body);
  if (!Array.isArray(tJson)) throw new Error('/api/tools did not return array');

  server.close();
  for (const f of [tmpDb, tmpDb + '-wal', tmpDb + '-shm']) {
    try { fs.unlinkSync(f); } catch (_) {}
  }
  console.log('smoke passed');
}

smoke().catch((err) => {
  console.error('smoke FAILED:', err);
  process.exit(1);
});
