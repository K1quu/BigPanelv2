'use strict';
const router = require('express').Router();
const db = require('../db/database');
const rcon = require('../services/rcon.service');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

// Current online players (from latest sessions with no left_at)
router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT username, server_id, joined_at
    FROM player_sessions
    WHERE left_at IS NULL
    ORDER BY joined_at DESC
  `).all();
  res.json(rows);
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

  try {
    const resp = await rcon.send(server_id, `kick ${username} ${reason}`);
    res.json({ ok: true, response: resp });
  } catch (err) {
    res.status(502).json({ error: `RCON недоступен: ${err.message}` });
  }
});

// Ban player via RCON (admin+)
router.post('/ban', requireAuth, requireRole('admin'), async (req, res) => {
  const { username, server_id, reason = 'Banned by admin' } = req.body || {};
  if (!username || !server_id) return res.status(400).json({ error: 'username и server_id обязательны' });
  if (!['lobby', 'game'].includes(server_id)) return res.status(400).json({ error: 'Неверный server_id' });

  try {
    const resp = await rcon.send(server_id, `ban ${username} ${reason}`);
    res.json({ ok: true, response: resp });
  } catch (err) {
    res.status(502).json({ error: `RCON недоступен: ${err.message}` });
  }
});

module.exports = router;
