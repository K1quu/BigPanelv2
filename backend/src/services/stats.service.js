'use strict';
const cron = require('node-cron');
const db = require('../db/database');
const mc = require('./minecraft.service');
const events = require('../events');

// In-memory server state (read by API endpoints without DB hit)
const state = {
  velocity: { id: 'velocity', name: 'Velocity', type: 'proxy',  online: false, players: 0, maxPlayers: 0, version: '', motd: '', tps: null, updatedAt: null },
  lobby:    { id: 'lobby',    name: 'Lobby-1',  type: 'paper',  online: false, players: 0, maxPlayers: 0, version: '', motd: '', tps: null, updatedAt: null },
  game:     { id: 'game',     name: 'Lite-1',   type: 'paper',  online: false, players: 0, maxPlayers: 0, version: '', motd: '', tps: null, updatedAt: null },
};

// Track online players per server for session detection
// { serverId: Set<username> }
const onlinePlayers = { lobby: new Set(), game: new Set() };

async function tick() {
  const now = Date.now();

  // --- Ping all 3 servers ---
  const [velPing, lobPing, gamePing] = await Promise.all([
    mc.pingServer(process.env.VELOCITY_HOST || '127.0.0.1', process.env.VELOCITY_PORT || 25565),
    mc.pingServer(process.env.LOBBY_HOST   || '127.0.0.1', process.env.LOBBY_PORT   || 25566),
    mc.pingServer(process.env.GAME_HOST    || '127.0.0.1', process.env.GAME_PORT    || 25567),
  ]);

  Object.assign(state.velocity, { ...velPing, updatedAt: now });
  Object.assign(state.lobby,    { ...lobPing, updatedAt: now });
  Object.assign(state.game,     { ...gamePing, updatedAt: now });

  // --- TPS + player list via RCON (only if server is online) ---
  if (lobPing.online) {
    const [tps, players] = await Promise.all([mc.getTPS('lobby'), mc.getPlayerList('lobby')]);
    state.lobby.tps = tps;
    updateSessions('lobby', players, now);
    state.lobby.players = players.length > 0 ? players.length : lobPing.players;
  } else {
    clearSessions('lobby', now);
  }

  if (gamePing.online) {
    const [tps, players] = await Promise.all([mc.getTPS('game'), mc.getPlayerList('game')]);
    state.game.tps = tps;
    updateSessions('game', players, now);
    state.game.players = players.length > 0 ? players.length : gamePing.players;
  } else {
    clearSessions('game', now);
  }

  // --- Persist snapshots ---
  const insert = db.prepare(
    'INSERT INTO online_history(server_id, player_count, tps, timestamp) VALUES(?,?,?,?)'
  );
  const ts = Math.floor(now / 1000);
  for (const s of Object.values(state)) {
    insert.run(s.id, s.players, s.tps, ts);
  }

  // --- Broadcast ---
  events.emit('tick', {
    servers: Object.values(state),
    totalOnline: state.velocity.players,
  });
}

function updateSessions(serverId, currentList, now) {
  const prev = onlinePlayers[serverId];
  const curr = new Set(currentList);
  const ts = Math.floor(now / 1000);

  // Joined
  for (const name of curr) {
    if (!prev.has(name)) {
      db.prepare(
        'INSERT INTO player_sessions(username, server_id, joined_at) VALUES(?,?,?)'
      ).run(name, serverId, ts);
      events.emit('player_join', { username: name, server: serverId });
    }
  }

  // Left
  for (const name of prev) {
    if (!curr.has(name)) {
      db.prepare(
        'UPDATE player_sessions SET left_at=? WHERE username=? AND server_id=? AND left_at IS NULL'
      ).run(ts, name, serverId);
      events.emit('player_leave', { username: name, server: serverId });
    }
  }

  onlinePlayers[serverId] = curr;
}

function clearSessions(serverId, now) {
  const prev = onlinePlayers[serverId];
  if (prev.size === 0) return;
  const ts = Math.floor(now / 1000);
  for (const name of prev) {
    db.prepare(
      'UPDATE player_sessions SET left_at=? WHERE username=? AND server_id=? AND left_at IS NULL'
    ).run(ts, name, serverId);
    events.emit('player_leave', { username: name, server: serverId });
  }
  onlinePlayers[serverId] = new Set();
}

function getState() {
  return Object.values(state);
}

function startStats() {
  tick().catch(err => console.error('[stats] initial tick failed:', err.message));
  cron.schedule('*/30 * * * * *', () => {
    tick().catch(err => console.error('[stats] tick failed:', err.message));
  });
  console.log('[stats] Collecting every 30 seconds');
}

module.exports = { startStats, getState };
