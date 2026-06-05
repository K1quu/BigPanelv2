'use strict';
const { Rcon } = require('rcon-client');

class RconConnection {
  constructor(id, host, port, password) {
    this.id = id;
    this.host = host;
    this.port = parseInt(port, 10);
    this.password = password;
    this.rcon = null;
    this.connected = false;
    this._timer = null;
  }

  async connect() {
    clearTimeout(this._timer);
    try {
      const rcon = new Rcon({ host: this.host, port: this.port, password: this.password, timeout: 5000 });
      await rcon.connect();
      this.rcon = rcon;
      this.connected = true;
      console.log(`[RCON] Connected to ${this.id} (${this.host}:${this.port})`);
    } catch (err) {
      this.connected = false;
      this.rcon = null;
      console.warn(`[RCON] ${this.id} unavailable: ${err.message}`);
      this._timer = setTimeout(() => this.connect(), 15000);
    }
  }

  async send(command) {
    if (!this.connected || !this.rcon) throw new Error(`RCON not connected: ${this.id}`);
    try {
      return await this.rcon.send(command);
    } catch (err) {
      this.connected = false;
      this.rcon = null;
      this._timer = setTimeout(() => this.connect(), 15000);
      throw err;
    }
  }
}

const connections = {};

function init() {
  const servers = {
    lobby: {
      host: process.env.LOBBY_HOST || '127.0.0.1',
      port: process.env.LOBBY_RCON_PORT || 25576,
      password: process.env.LOBBY_RCON_PASS || '',
    },
    game: {
      host: process.env.GAME_HOST || '127.0.0.1',
      port: process.env.GAME_RCON_PORT || 25577,
      password: process.env.GAME_RCON_PASS || '',
    },
  };

  for (const [id, cfg] of Object.entries(servers)) {
    if (!cfg.password) {
      console.warn(`[RCON] No password configured for ${id}, skipping`);
      continue;
    }
    connections[id] = new RconConnection(id, cfg.host, cfg.port, cfg.password);
    connections[id].connect();
  }
}

async function send(serverId, command) {
  const conn = connections[serverId];
  if (!conn) throw new Error(`Unknown server: ${serverId}`);
  return conn.send(command);
}

function isConnected(serverId) {
  return !!(connections[serverId] && connections[serverId].connected);
}

module.exports = { init, send, isConnected };
