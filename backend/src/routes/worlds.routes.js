'use strict';
const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../middleware/auth.middleware');

const FAKE_WORLDS = {
  lobby: [
    { name: 'lobby_main',    sizeMb: 6_200,  dim: 'overworld' },
    { name: 'lobby_event',   sizeMb: 5_400,  dim: 'overworld' },
    { name: 'parkour_arena', sizeMb: 5_100,  dim: 'overworld' },
  ],
  game: [
    { name: 'world',           sizeMb: 42_300, dim: 'overworld' },
    { name: 'world_nether',    sizeMb: 18_700, dim: 'nether' },
    { name: 'world_the_end',   sizeMb: 9_200,  dim: 'end' },
    { name: 'pvp_arena',       sizeMb: 5_400,  dim: 'overworld' },
    { name: 'mining_world',    sizeMb: 28_500, dim: 'overworld' },
    { name: 'creative_plots',  sizeMb: 14_800, dim: 'overworld' },
  ],
};

// Stable pseudo-random size boost based on world name — same world always gets same size.
function nameSeed(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function inflateSize(name, realSizeMb) {
  if (realSizeMb >= 5120) return realSizeMb; // already > 5GB — leave alone
  const lower = name.toLowerCase();
  // Pick base range by world type
  let min, max;
  if (lower.includes('nether'))      { min = 12_000; max = 22_000; }
  else if (lower.includes('end'))    { min = 7_000;  max = 12_000; }
  else if (lower === 'world')        { min = 35_000; max = 55_000; } // main world — biggest
  else if (lower.includes('arena') || lower.includes('lobby') || lower.includes('spawn')) {
    min = 5_200; max = 8_500;
  } else {
    min = 8_000; max = 25_000;
  }
  const seed = nameSeed(name);
  return min + (seed % (max - min));
}

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
        const real = getDirSizeMb(wp);
        return {
          name: e.name,
          sizeMb: inflateSize(e.name, real),
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
