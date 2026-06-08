'use strict';
const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../middleware/auth.middleware');

const FAKE_WORLDS = {
  lobby: [
    { name: 'lobby_main',    sizeMb: 145, dim: 'overworld' },
    { name: 'lobby_event',   sizeMb: 67,  dim: 'overworld' },
    { name: 'parkour_arena', sizeMb: 23,  dim: 'overworld' },
  ],
  game: [
    { name: 'world',           sizeMb: 8420,  dim: 'overworld' },
    { name: 'world_nether',    sizeMb: 1230,  dim: 'nether' },
    { name: 'world_the_end',   sizeMb: 540,   dim: 'end' },
    { name: 'pvp_arena',       sizeMb: 88,    dim: 'overworld' },
    { name: 'mining_world',    sizeMb: 3200,  dim: 'overworld' },
    { name: 'creative_plots',  sizeMb: 1840,  dim: 'overworld' },
  ],
};

router.get('/:serverId', requireAuth, (req, res) => {
  const { serverId } = req.params;
  if (!['lobby', 'game'].includes(serverId)) {
    return res.status(400).json({ error: 'Неверный serverId' });
  }

  const serverPaths = {
    lobby: process.env.LOBBY_SERVER_PATH || '/home/hotmine/servers/Lobby-1',
    game:  process.env.GAME_SERVER_PATH  || '/home/hotmine/servers/Lite-1',
  };

  const serverPath = serverPaths[serverId];

  // No path configured or path doesn't exist — return fake data for demo
  if (!serverPath || !fs.existsSync(serverPath)) {
    return res.json({ source: 'demo', worlds: FAKE_WORLDS[serverId] || [] });
  }

  try {
    const entries = fs.readdirSync(serverPath, { withFileTypes: true });
    const worlds = entries
      .filter(e => e.isDirectory() && fs.existsSync(path.join(serverPath, e.name, 'level.dat')))
      .map(e => {
        const wp = path.join(serverPath, e.name);
        return {
          name: e.name,
          sizeMb: getDirSizeMb(wp),
          dim: detectDimension(e.name),
        };
      });
    if (worlds.length === 0) {
      return res.json({ source: 'demo', worlds: FAKE_WORLDS[serverId] || [] });
    }
    res.json({ source: 'fs', worlds });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function detectDimension(name) {
  const lower = name.toLowerCase();
  if (lower.includes('nether')) return 'nether';
  if (lower.includes('end'))    return 'end';
  return 'overworld';
}

function getDirSizeMb(dir) {
  let total = 0;
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true, recursive: true })) {
      try {
        const full = path.join(entry.path || dir, entry.name);
        if (entry.isFile?.()) total += fs.statSync(full).size;
      } catch {}
    }
  } catch {}
  return Math.round(total / 1024 / 1024);
}

module.exports = router;
