'use strict';
const { status } = require('minecraft-server-util');
const rcon = require('./rcon.service');

function stripColorCodes(str) {
  return str.replace(/§./g, '').replace(/§./g, '');
}

function parseTPS(rconResponse) {
  const clean = stripColorCodes(rconResponse);
  const match = clean.match(/(\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : null;
}

function parsePlayerList(rconResponse) {
  const match = rconResponse.match(/players online:\s*(.+)/i);
  if (!match || !match[1].trim()) return [];
  return match[1].split(',').map(p => stripColorCodes(p).trim()).filter(Boolean);
}

function parsePlugins(rconResponse) {
  const clean = stripColorCodes(rconResponse);
  const match = clean.match(/Plugins \(\d+\):\s*(.+)/i);
  if (!match) return [];
  return match[1].split(',').map(p => p.trim()).filter(Boolean);
}

async function pingServer(host, port) {
  // Try up to 2 times — Velocity can drop occasional SLP requests
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await status(host, parseInt(port, 10), { timeout: 5000, enableSRV: false });
      const motd = result.description
        ? (typeof result.description === 'string'
            ? result.description
            : result.description.descriptionText || result.description.text || '')
        : '';
      return {
        online: true,
        players: result.players.online,
        maxPlayers: result.players.max,
        version: result.version.name,
        motd: stripColorCodes(motd),
        sample: (result.players.sample || []).map(p => p.name),
      };
    } catch {
      if (attempt < 1) await new Promise(r => setTimeout(r, 1500));
    }
  }
  return { online: false, players: 0, maxPlayers: 0, version: '', motd: '', sample: [] };
}

async function getTPS(serverId) {
  try {
    const resp = await rcon.send(serverId, 'tps');
    return parseTPS(resp);
  } catch {
    return null;
  }
}

async function getPlayerList(serverId) {
  try {
    const resp = await rcon.send(serverId, 'list');
    return parsePlayerList(resp);
  } catch {
    return [];
  }
}

async function getPlugins(serverId) {
  try {
    const resp = await rcon.send(serverId, 'plugins');
    return parsePlugins(resp);
  } catch {
    return [];
  }
}

module.exports = { pingServer, getTPS, getPlayerList, getPlugins, parsePlugins, stripColorCodes };
