'use strict';
const router = require('express').Router();
const db = require('../db/database');
const audit = require('../services/audit.service');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const { getState } = require('../services/stats.service');
const registered = require('../services/registered.service');

// Total registered players (simulated growing counter)
router.get('/registered', requireAuth, (req, res) => {
  res.json({ total: registered.get() });
});

// Current online snapshot
router.get('/online', requireAuth, (req, res) => {
  const state = getState();
  const result = {};
  for (const s of state) result[s.id] = s.players;
  res.json(result);
});

// History — range: 1h | 6h | 24h | 7d
router.get('/history', requireAuth, (req, res) => {
  const { range = '24h', server } = req.query;
  const ranges = { '1h': 3600, '6h': 21600, '24h': 86400, '7d': 604800 };
  const seconds = ranges[range] || 86400;
  const since = Math.floor(Date.now() / 1000) - seconds;

  const where = server ? 'AND server_id = ?' : '';
  const args = server ? [since, server] : [since];

  const rows = db.prepare(`
    SELECT server_id, player_count, tps, timestamp
    FROM online_history
    WHERE timestamp >= ? ${where}
    ORDER BY timestamp ASC
  `).all(...args);

  res.json(rows);
});

// Clear all online history (admin+)
router.delete('/history', requireAuth, requireRole('admin'), (req, res) => {
  const r = db.prepare('DELETE FROM online_history').run();
  audit.log(req, 'history_cleared', null, { rows: r.changes });
  res.json({ ok: true, deleted: r.changes });
});

module.exports = router;
