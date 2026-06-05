'use strict';
const { exec } = require('child_process');
const rcon = require('./rcon.service');

const CONTAINERS = {
  lobby: () => process.env.LOBBY_CONTAINER,
  game:  () => process.env.GAME_CONTAINER,
};

function runDocker(args) {
  return new Promise((resolve, reject) => {
    exec(`docker ${args}`, { timeout: 15000 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr.trim() || err.message));
      resolve(stdout.trim());
    });
  });
}

function getContainer(serverId) {
  const name = CONTAINERS[serverId]?.();
  if (!name) throw new Error(`Контейнер для ${serverId} не настроен в .env`);
  return name;
}

async function start(serverId) {
  const name = getContainer(serverId);
  return runDocker(`start ${name}`);
}

async function stop(serverId) {
  const name = getContainer(serverId);
  // Try graceful RCON stop first, then docker stop as backup
  try {
    if (rcon.isConnected(serverId)) {
      await rcon.send(serverId, 'stop');
      await new Promise(r => setTimeout(r, 3000));
    }
  } catch {}
  return runDocker(`stop ${name}`);
}

async function restart(serverId) {
  const name = getContainer(serverId);
  return runDocker(`restart ${name}`);
}

async function isContainerRunning(serverId) {
  try {
    const name = getContainer(serverId);
    const out = await runDocker(`inspect -f "{{.State.Running}}" ${name}`);
    return out.trim() === 'true';
  } catch {
    return null;
  }
}

module.exports = { start, stop, restart, isContainerRunning, getContainer };
