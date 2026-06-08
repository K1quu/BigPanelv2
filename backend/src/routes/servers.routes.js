'use strict';
const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const { getState } = require('../services/stats.service');
const docker = require('../services/docker.service');
const db = require('../db/database');
const audit = require('../services/audit.service');
const health = require('../services/health.service');
const serverstats = require('../services/serverstats.service');

router.get('/', requireAuth, (req, res) => {
  res.json(getState());
});

router.get('/:id', requireAuth, (req, res) => {
  const server = getState().find(s => s.id === req.params.id);
  if (!server) return res.status(404).json({ error: 'Сервер не найден' });
  res.json(server);
});

// Detailed stats with plugin breakdown, network, history
router.get('/:id/details', requireAuth, (req, res) => {
  const id = req.params.id;
  const server = getState().find(s => s.id === id);
  if (!server) return res.status(404).json({ error: 'Сервер не найден' });
  if (!['lobby', 'game'].includes(id)) {
    // Proxy doesn't have plugin breakdown
    return res.json({ server, plugins: [], history: null, network: null });
  }
  const range = parseInt(req.query.range, 10) || 3600;
  res.json({
    server,
    plugins: serverstats.getPluginBreakdown(id, server.health?.cpuProcess || 20),
    network: serverstats.getNetwork(id, server.players || 0),
    uptime:  serverstats.getUptime(id),
    avgPing: serverstats.getAvgPing(server.players || 0),
    history: health.getHistory(id, range),
  });
});

// --- Container actions (admin+) ---
async function runAction(action, req, res) {
  const id = req.params.id;
  if (!['lobby', 'game'].includes(id)) {
    return res.status(400).json({ error: 'Управление доступно только для Lobby-1 и Lite-1' });
  }
  try {
    const out = await docker[action](id);
    audit.log(req, `server_${action}`, id, { result: 'ok' });
    res.json({ ok: true, message: out || 'Готово' });
  } catch (err) {
    audit.log(req, `server_${action}`, id, { result: 'error', error: err.message });
    res.status(500).json({ error: err.message });
  }
}

router.post('/:id/start',   requireAuth, requireRole('admin'),      (req, res) => runAction('start',   req, res));
router.post('/:id/stop',    requireAuth, requireRole('admin'),      (req, res) => runAction('stop',    req, res));
router.post('/:id/restart', requireAuth, requireRole('admin'),      (req, res) => runAction('restart', req, res));

module.exports = router;
