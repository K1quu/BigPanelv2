'use strict';
const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const { getState } = require('../services/stats.service');
const docker = require('../services/docker.service');
const db = require('../db/database');
const audit = require('../services/audit.service');

router.get('/', requireAuth, (req, res) => {
  res.json(getState());
});

router.get('/:id', requireAuth, (req, res) => {
  const server = getState().find(s => s.id === req.params.id);
  if (!server) return res.status(404).json({ error: 'Сервер не найден' });
  res.json(server);
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
