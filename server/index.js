const express   = require('express');
const path      = require('path');
const { getDb } = require('./db');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/tools',            require('./routes/tools'));
app.use('/api/ratings/:toolId',  require('./routes/ratings'));
app.use('/api/comments/:toolId', require('./routes/comments'));
app.use('/api/creators',         require('./routes/creators'));

app.get('*', (_req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'))
);

// Initialize DB before accepting connections
getDb().then(() => {
  app.listen(PORT, () =>
    console.log(`⚡ Vibe App Store → http://localhost:${PORT}`)
  );
}).catch(err => {
  console.error('DB init failed:', err);
  process.exit(1);
});
