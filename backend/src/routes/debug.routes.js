'use strict';
const router = require('express').Router();
const rcon = require('../services/rcon.service');
const mc = require('../services/minecraft.service');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

router.get('/players/:serverId', requireAuth, requireRole('admin'), async (req, res) => {
  const { serverId } = req.params;
  if (!['lobby', 'game'].includes(serverId)) return res.status(400).json({ error: 'lobby или game' });

  const result = {
    serverId,
    rconConnected: rcon.isConnected(serverId),
    rconRawList:   null,
    rconParsed:    null,
    rconError:     null,
    slpSample:     null,
    slpError:      null,
  };

  // RCON list
  try {
    const raw = await rcon.send(serverId, 'list');
    result.rconRawList = raw;
    result.rconParsed = mc.parsePlayerList(raw);
  } catch (err) {
    result.rconError = err.message;
  }

  // SLP ping
  try {
    const host = serverId === 'lobby' ? process.env.LOBBY_HOST : process.env.GAME_HOST;
    const port = serverId === 'lobby' ? process.env.LOBBY_PORT : process.env.GAME_PORT;
    const ping = await mc.pingServer(host || '127.0.0.1', port);
    result.slpSample = ping.sample;
    result.slpOnline = ping.online;
    result.slpPlayers = ping.players;
  } catch (err) {
    result.slpError = err.message;
  }

  res.json(result);
});

module.exports = router;
