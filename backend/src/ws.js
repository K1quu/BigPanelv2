'use strict';
const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const events = require('./events');

const clients = new Set();
let wss = null;

function parseCookies(header) {
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').map(c => {
      const [k, ...v] = c.trim().split('=');
      return [k, v.join('=')];
    })
  );
}

function attach(httpServer) {
  wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req, socket, head) => {
    if (!req.url.startsWith('/ws')) return;
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token')
      || parseCookies(req.headers.cookie).token;
    try {
      jwt.verify(token, process.env.JWT_SECRET || 'secret');
    } catch {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, ws => {
      clients.add(ws);
      ws.isAlive = true;
      ws.on('close', () => clients.delete(ws));
      ws.on('pong', () => { ws.isAlive = true; });
    });
  });

  // Heartbeat — drop dead connections
  setInterval(() => {
    for (const ws of clients) {
      if (!ws.isAlive) { ws.terminate(); continue; }
      ws.isAlive = false;
      try { ws.ping(); } catch {}
    }
  }, 30000);

  // Forward stats events to all clients
  events.on('tick', payload => broadcast({ type: 'tick', ...payload }));
  events.on('player_join',  d => broadcast({ type: 'player_join',  ...d }));
  events.on('player_leave', d => broadcast({ type: 'player_leave', ...d }));
}

function broadcast(msg) {
  const data = JSON.stringify(msg);
  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) ws.send(data);
  }
}

module.exports = { attach };
