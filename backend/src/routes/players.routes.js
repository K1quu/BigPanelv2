'use strict';
const router = require('express').Router();
const db = require('../db/database');
const rcon = require('../services/rcon.service');
const audit = require('../services/audit.service');
const fake = require('../services/fakeplayers.service');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

// Current online players — real DB + fake players, with search and pagination
router.get('/', requireAuth, (req, res) => {
  const search = (req.query.search || '').trim();
  const server = req.query.server || null;
  const limit  = Math.min(parseInt(req.query.limit, 10) || 200, 1000);
  const offset = parseInt(req.query.offset, 10) || 0;

  // Real players from DB
  let realQuery = `
    SELECT username, server_id, MAX(joined_at) AS joined_at, 0 AS fake
    FROM player_sessions
    WHERE left_at IS NULL
  `;
  const args = [];
  if (search) { realQuery += ' AND username LIKE ?'; args.push(`%${search}%`); }
  if (server) { realQuery += ' AND server_id = ?';   args.push(server); }
  realQuery += ' GROUP BY username, server_id';
  const real = db.prepare(realQuery).all(...args);

  // Fake players (in-memory)
  const fakes = fake.getPlayers({ search, server, limit: 5000 });

  // Merge — real takes precedence on username conflict
  const realNames = new Set(real.map(r => r.username));
  const merged = [
    ...real,
    ...fakes.filter(f => !realNames.has(f.username)),
  ].sort((a, b) => b.joined_at - a.joined_at);

  const total = merged.length;
  res.json({
    total,
    players: merged.slice(offset, offset + limit),
  });
});

// Session history with optional search by username
router.get('/history', requireAuth, (req, res) => {
  const { search, limit = 100, offset = 0 } = req.query;
  const lim = Math.min(parseInt(limit, 10) || 100, 500);
  const off = parseInt(offset, 10) || 0;

  if (search) {
    const rows = db.prepare(`
      SELECT * FROM player_sessions
      WHERE username LIKE ?
      ORDER BY joined_at DESC
      LIMIT ? OFFSET ?
    `).all(`%${search}%`, lim, off);
    return res.json(rows);
  }

  const rows = db.prepare(
    'SELECT * FROM player_sessions ORDER BY joined_at DESC LIMIT ? OFFSET ?'
  ).all(lim, off);
  res.json(rows);
});

// Kick player via RCON (admin+)
router.post('/kick', requireAuth, requireRole('admin'), async (req, res) => {
  const { username, server_id, reason = 'Kicked by admin' } = req.body || {};
  if (!username || !server_id) return res.status(400).json({ error: 'username и server_id обязательны' });
  if (!['lobby', 'game'].includes(server_id)) return res.status(400).json({ error: 'Неверный server_id' });

  // If it's a fake player, just remove from sim
  if (fake.remove(username)) {
    audit.log(req, 'player_kick', username, { server: server_id, reason });
    return res.json({ ok: true, response: `${username} был кикнут` });
  }

  try {
    const resp = await rcon.send(server_id, `kick ${username} ${reason}`);
    audit.log(req, 'player_kick', username, { server: server_id, reason });
    res.json({ ok: true, response: resp });
  } catch (err) {
    audit.log(req, 'player_kick', username, { server: server_id, error: err.message });
    res.status(502).json({ error: `RCON недоступен: ${err.message}` });
  }
});

// Ban player via RCON (admin+)
router.post('/ban', requireAuth, requireRole('admin'), async (req, res) => {
  const { username, server_id, reason = 'Banned by admin' } = req.body || {};
  if (!username || !server_id) return res.status(400).json({ error: 'username и server_id обязательны' });
  if (!['lobby', 'game'].includes(server_id)) return res.status(400).json({ error: 'Неверный server_id' });

  if (fake.remove(username)) {
    audit.log(req, 'player_ban', username, { server: server_id, reason });
    return res.json({ ok: true, response: `${username} был забанен` });
  }

  try {
    const resp = await rcon.send(server_id, `ban ${username} ${reason}`);
    audit.log(req, 'player_ban', username, { server: server_id, reason });
    res.json({ ok: true, response: resp });
  } catch (err) {
    audit.log(req, 'player_ban', username, { server: server_id, error: err.message });
    res.status(502).json({ error: `RCON недоступен: ${err.message}` });
  }
});

module.exports = router;
