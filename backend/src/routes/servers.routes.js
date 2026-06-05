'use strict';
const router = require('express').Router();
const { requireAuth } = require('../middleware/auth.middleware');
const { getState } = require('../services/stats.service');

router.get('/', requireAuth, (req, res) => {
  res.json(getState());
});

router.get('/:id', requireAuth, (req, res) => {
  const server = getState().find(s => s.id === req.params.id);
  if (!server) return res.status(404).json({ error: 'Сервер не найден' });
  res.json(server);
});

module.exports = router;
