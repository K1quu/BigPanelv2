'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const http = require('http');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

// Initialize DB first (creates tables + seed user)
require('./db/database');

const { attach: attachWss } = require('./ws');
const { startStats } = require('./services/stats.service');
const rcon = require('./services/rcon.service');

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth',    require('./routes/auth.routes'));
app.use('/api/servers', require('./routes/servers.routes'));
app.use('/api/players', require('./routes/players.routes'));
app.use('/api/stats',   require('./routes/stats.routes'));
app.use('/api/console', require('./routes/console.routes'));
app.use('/api/plugins', require('./routes/plugins.routes'));
app.use('/api/worlds',  require('./routes/worlds.routes'));
app.use('/api/users',   require('./routes/users.routes'));
app.use('/api/audit',   require('./routes/audit.routes'));
app.use('/api/debug',   require('./routes/debug.routes'));

// Serve built frontend in production
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(frontendDist, 'index.html'));
});

attachWss(server);
rcon.init();
startStats();

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n  MC Panel backend → http://localhost:${PORT}\n`);
});
