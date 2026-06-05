'use strict';
const router = require('express').Router();
const { requireAuth } = require('../middleware/auth.middleware');
const { getPlugins } = require('../services/minecraft.service');

router.get('/:serverId', requireAuth, async (req, res) => {
  const { serverId } = req.params;
  if (!['lobby', 'game'].includes(serverId)) return res.status(400).json({ error: 'Неверный serverId' });
  const plugins = await getPlugins(serverId);
  res.json(plugins);
});

module.exports = router;
