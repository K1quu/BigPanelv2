'use strict';
const { status } = require('minecraft-server-util');
const rcon = require('./rcon.service');

function stripColorCodes(str) {
  return str.replace(/§./g, '').replace(/§./g, '');
}

function parseTPS(rconResponse) {
  const clean = stripColorCodes(rconResponse).replace(/[◴*]/g, '');

  // --- mspt output (Paper / Patina) ---
  // "Server tick times (avg/min/max) from last 5s, 10s, 1m: 3.6/1.1/7.2, ..."
  if (/tick times|mspt/i.test(clean)) {
    const afterColon = clean.split(':').slice(1).join(':');
    const firstAvg = afterColon.match(/(\d+(?:\.\d+)?)\s*\//);
    if (firstAvg) {
      const mspt = parseFloat(firstAvg[1]);
      if (mspt > 0) return Math.min(20, +(1000 / mspt).toFixed(1));
    }
    return null;
  }

  // --- Standard tps output ---
  // "TPS from last 1m, 5m, 15m: 20.0, 20.0, 20.0"
  if (/tps from last/i.test(clean)) {
    const afterColon = clean.split(':').slice(1).join(':');
    const m = afterColon.match(/(\d+(?:\.\d+)?)/);
    if (m) return parseFloat(m[1]);
  }

  // --- Generic fallback ---
  const all = [...clean.matchAll(/(\d+\.\d+)/g)].map(m => parseFloat(m[1]));
  const valid = all.find(v => v > 0 && v <= 20);
  return valid !== undefined ? valid : null;
}

function parsePlayerList(rconResponse) {
  const clean = stripColorCodes(rconResponse);
  const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  // English vanilla/Paper: "There are 1 of a max of 20 players online: name1, name2"
  // Patina EN:            "Players online: name1, name2"
  const en = clean.match(/(?:players online|of\s+\d+\s+players online):\s*(.+)/i);
  if (en && en[1].trim()) {
    return splitNames(en[1]);
  }

  // Russian Patina format (single line): "Сейчас 1 из 180 игроков на сервере."
  // Followed by group lines: "Admins: K1qu"  /  "VIP: foo, bar"
  // Collect names from all lines that look like "GroupName: names..."
  const names = [];
  for (let i = 1; i < lines.length; i++) {
    const m = lines[i].match(/^[^:]+:\s*(.+)$/);
    if (m && m[1].trim()) names.push(...splitNames(m[1]));
  }
  if (names.length > 0) return names;

  // Final fallback — try any line containing a colon
  const anyColon = clean.match(/:\s*([A-Za-z0-9_, ]+)\s*$/m);
  if (anyColon && anyColon[1].trim()) return splitNames(anyColon[1]);

  return [];
}

function splitNames(s) {
  return s.split(/[,]/)
    .map(p => p.trim())
    .filter(p => p && /^[A-Za-z0-9_]{1,16}$/.test(p));
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
  // Try a few common commands — first non-empty parsed result wins.
  // Override via env TPS_COMMAND if needed.
  const customCmd = process.env.TPS_COMMAND;
  const commands = customCmd ? [customCmd] : ['mspt', 'tps', 'spark tps'];
  for (const cmd of commands) {
    try {
      const resp = await rcon.send(serverId, cmd);
      if (!resp || !resp.trim()) continue;
      const tps = parseTPS(resp);
      if (tps !== null && tps > 0 && tps <= 25) return tps;
    } catch {}
  }
  return null;
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

module.exports = { pingServer, getTPS, getPlayerList, getPlugins, parsePlugins, parsePlayerList, stripColorCodes };
