'use strict';
const db = require('../db/database');
const mc = require('./minecraft.service');
const rcon = require('./rcon.service');
const events = require('../events');

// In-memory server state (read by API endpoints without DB hit)
const state = {
  velocity: { id: 'velocity', name: 'Velocity', type: 'proxy',  online: false, players: 0, maxPlayers: 0, version: '', motd: '', tps: null, updatedAt: null },
  lobby:    { id: 'lobby',    name: 'Lobby-1',  type: 'paper',  online: false, players: 0, maxPlayers: 0, version: '', motd: '', tps: null, updatedAt: null },
  game:     { id: 'game',     name: 'Lite-1',   type: 'paper',  online: false, players: 0, maxPlayers: 0, version: '', motd: '', tps: null, updatedAt: null },
};

// Track online players per server for session detection
const onlinePlayers = { lobby: new Set(), game: new Set() };

/**
 * Fast tick — every 5 seconds. Ping only + RCON player list.
 * Broadcasts to WebSocket clients for near-realtime UI.
 */
async function fastTick() {
  const now = Date.now();

  const [velPing, lobPing, gamePing] = await Promise.all([
    mc.pingServer(process.env.VELOCITY_HOST || '127.0.0.1', process.env.VELOCITY_PORT || 25577),
    mc.pingServer(process.env.LOBBY_HOST    || '127.0.0.1', process.env.LOBBY_PORT    || 25541),
    mc.pingServer(process.env.GAME_HOST     || '127.0.0.1', process.env.GAME_PORT     || 25591),
  ]);

  // Merge — preserve last known data if ping fails
  const merge = (cur, ping) => ({
    ...cur, ...ping, updatedAt: now,
    players: ping.online ? ping.players : cur.players,
    version: ping.online ? ping.version : cur.version,
    maxPlayers: ping.online ? ping.maxPlayers : cur.maxPlayers,
    motd: ping.online ? ping.motd : cur.motd,
  });
  Object.assign(state.velocity, merge(state.velocity, velPing));
  Object.assign(state.lobby,    merge(state.lobby,    lobPing));
  Object.assign(state.game,     merge(state.game,     gamePing));

  // --- Player list: prefer RCON, fallback to SLP sample, fallback to last set ---
  await collectPlayers('lobby', lobPing, now);
  await collectPlayers('game',  gamePing, now);

  // If RCON gave us players, use that count; else use SLP ping count
  if (onlinePlayers.lobby.size > 0) state.lobby.players = onlinePlayers.lobby.size;
  if (onlinePlayers.game.size  > 0) state.game.players  = onlinePlayers.game.size;

  events.emit('tick', { servers: Object.values(state) });
}

/**
 * Slow tick — every 30 seconds. Also fetches TPS and writes history snapshot.
 */
async function slowTick() {
  const now = Date.now();

  // TPS via RCON
  if (state.lobby.online && rcon.isConnected('lobby')) {
    state.lobby.tps = await mc.getTPS('lobby');
  }
  if (state.game.online && rcon.isConnected('game')) {
    state.game.tps = await mc.getTPS('game');
  }

  // Persist history snapshot
  const insert = db.prepare(
    'INSERT INTO online_history(server_id, player_count, tps, timestamp) VALUES(?,?,?,?)'
  );
  const ts = Math.floor(now / 1000);
  for (const s of Object.values(state)) {
    insert.run(s.id, s.players, s.tps, ts);
  }
}

async function collectPlayers(serverId, ping, now) {
  if (!ping.online) {
    clearSessions(serverId, now);
    return;
  }

  let list = [];
  // 1. Try RCON list (most reliable, gives full names)
  if (rcon.isConnected(serverId)) {
    list = await mc.getPlayerList(serverId);
  }
  // 2. Fallback to SLP sample (limited to ~12 names, but better than nothing)
  if (list.length === 0 && ping.sample && ping.sample.length > 0) {
    list = ping.sample;
  }
  // 3. If still empty but ping shows online players, we can't list them — keep prev set
  if (list.length === 0 && ping.players > 0) {
    return; // don't clear, just skip session tracking this tick
  }

  updateSessions(serverId, list, now);
}

function updateSessions(serverId, currentList, now) {
  const prev = onlinePlayers[serverId];
  const curr = new Set(currentList);
  const ts = Math.floor(now / 1000);

  for (const name of curr) {
    if (!prev.has(name)) {
      const open = db.prepare(
        'SELECT 1 FROM player_sessions WHERE username=? AND server_id=? AND left_at IS NULL'
      ).get(name, serverId);
      if (!open) {
        db.prepare(
          'INSERT INTO player_sessions(username, server_id, joined_at) VALUES(?,?,?)'
        ).run(name, serverId, ts);
      }
      events.emit('player_join', { username: name, server: serverId });
    }
  }

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
  // Close orphaned sessions from previous run
  const closed = db.prepare(
    'UPDATE player_sessions SET left_at=? WHERE left_at IS NULL'
  ).run(Math.floor(Date.now() / 1000));
  if (closed.changes > 0) {
    console.log(`[stats] Closed ${closed.changes} orphaned session(s) from previous run`);
  }

  // Run initial fast + slow so TPS appears immediately
  fastTick()
    .then(() => slowTick())
    .catch(err => console.error('[stats] initial tick failed:', err.message));

  // Fast: every 5 seconds for realtime UI
  setInterval(() => {
    fastTick().catch(err => console.error('[stats] fast tick failed:', err.message));
  }, 5000);

  // Slow: every 30 seconds for history + TPS
  setInterval(() => {
    slowTick().catch(err => console.error('[stats] slow tick failed:', err.message));
  }, 30000);

  console.log('[stats] Realtime ticks: 5s · history snapshot: 30s');
}

module.exports = { startStats, getState };
