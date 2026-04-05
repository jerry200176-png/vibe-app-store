const express      = require('express');
const path         = require('path');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const { getDb }    = require('./db');

const app  = express();
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        frameSrc: ["'self'", 'http:', 'https:'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
      },
    },
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true });
});

const apiPostLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '請求過於頻繁，請稍後再試。' },
});

const apiGetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 400,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '請求過於頻繁，請稍後再試。' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '登入/註冊請求過於頻繁，請稍後再試。' },
});

app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return apiPostLimiter(req, res, next);
  if (req.method === 'GET') return apiGetLimiter(req, res, next);
  next();
});

app.use('/api/auth/register', authLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth',             require('./routes/auth'));
app.use('/api/tools',            require('./routes/tools'));
app.use('/api/ratings/:toolId',  require('./routes/ratings'));
app.use('/api/comments/:toolId', require('./routes/comments'));
app.use('/api/creators',         require('./routes/creators'));
app.use('/api/reports',          require('./routes/reports'));
app.use('/api/admin',            require('./routes/admin'));
app.use('/api/transparency',     require('./routes/transparency'));
app.use('/api/feed.xml',         require('./routes/feed'));
app.use('/api/site',             require('./routes/site'));

app.get('*', (_req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'))
);

const server = getDb().then(() => {
  const s = app.listen(PORT, () =>
    console.log(`⚡ Vibe App Store → http://localhost:${PORT}`)
  );
  return s;
}).catch(err => {
  console.error('DB init failed:', err);
  process.exit(1);
});

module.exports = server;
