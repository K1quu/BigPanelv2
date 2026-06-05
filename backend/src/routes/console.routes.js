'use strict';
const router = require('express').Router();
const db = require('../db/database');
const rcon = require('../services/rcon.service');
const audit = require('../services/audit.service');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

// Send RCON command (admin+)
router.post('/command', requireAuth, requireRole('admin'), async (req, res) => {
  const { server_id, command } = req.body || {};
  if (!server_id || !command) return res.status(400).json({ error: 'server_id и command обязательны' });
  if (!['lobby', 'game'].includes(server_id)) return res.status(400).json({ error: 'Неверный server_id' });

  let response = null;
  let error = null;
  try {
    response = await rcon.send(server_id, command);
  } catch (err) {
    error = err.message;
  }

  const ts = Math.floor(Date.now() / 1000);
  db.prepare(
    'INSERT INTO console_log(admin_user, server_id, command, response, timestamp) VALUES(?,?,?,?,?)'
  ).run(req.user.username, server_id, command, response || error || '', ts);

  audit.log(req, 'console_command', server_id, { command, error: error || undefined });

  if (error) return res.status(502).json({ error: `RCON недоступен: ${error}` });
  res.json({ ok: true, response });
});

// Command history
router.get('/log', requireAuth, requireRole('admin'), (req, res) => {
  const { server_id, limit = 50 } = req.query;
  const lim = Math.min(parseInt(limit, 10) || 50, 200);

  if (server_id) {
    const rows = db.prepare(
      'SELECT * FROM console_log WHERE server_id=? ORDER BY timestamp DESC LIMIT ?'
    ).all(server_id, lim);
    return res.json(rows);
  }

  const rows = db.prepare(
    'SELECT * FROM console_log ORDER BY timestamp DESC LIMIT ?'
  ).all(lim);
  res.json(rows);
});

module.exports = router;
