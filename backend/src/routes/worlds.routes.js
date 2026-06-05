'use strict';
const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../middleware/auth.middleware');

router.get('/:serverId', requireAuth, (req, res) => {
  const { serverId } = req.params;
  const serverPaths = {
    lobby: process.env.LOBBY_SERVER_PATH,
    game:  process.env.GAME_SERVER_PATH,
  };

  const serverPath = serverPaths[serverId];
  if (!serverPath) return res.status(400).json({ error: 'Путь к серверу не настроен в .env' });
  if (!fs.existsSync(serverPath)) return res.status(404).json({ error: 'Директория сервера не найдена' });

  try {
    const entries = fs.readdirSync(serverPath, { withFileTypes: true });
    const worlds = entries
      .filter(e => e.isDirectory() && fs.existsSync(path.join(serverPath, e.name, 'level.dat')))
      .map(e => ({ name: e.name, sizeMb: getDirSizeMb(path.join(serverPath, e.name)) }));
    res.json(worlds);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function getDirSizeMb(dir) {
  let total = 0;
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true, recursive: true })) {
      if (!entry.isFile?.() && !entry.isDirectory?.()) continue;
      if (entry.isFile?.() || (!entry.isDirectory?.() && !entry.isSymbolicLink?.())) {
        try { total += fs.statSync(path.join(entry.path || dir, entry.name)).size; } catch {}
      }
    }
  } catch {}
  return Math.round(total / 1024 / 1024);
}

module.exports = router;
