'use strict';
const db = require('../db/database');

/**
 * Write an audit log entry.
 * @param {object} req — express request (or null for system events)
 * @param {string} action — e.g. 'login', 'server_stop', 'user_created'
 * @param {string|null} target — id of affected entity (server, user, player)
 * @param {object|null} details — extra context (will be JSON-encoded)
 */
function log(req, action, target = null, details = null) {
  try {
    const username = req?.user?.username || (details && details.username) || null;
    const ip = req
      ? (req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || null)
      : null;
    db.prepare(
      'INSERT INTO audit_log(username, action, target, details, ip, timestamp) VALUES(?,?,?,?,?,?)'
    ).run(
      username,
      action,
      target,
      details ? JSON.stringify(details) : null,
      ip,
      Math.floor(Date.now() / 1000),
    );
  } catch (err) {
    console.error('[audit] write failed:', err.message);
  }
}

function list({ limit = 100, offset = 0, action = null, username = null } = {}) {
  const lim = Math.min(parseInt(limit, 10) || 100, 500);
  const off = parseInt(offset, 10) || 0;

  let where = '';
  const args = [];
  if (action)   { where += (where ? ' AND ' : ' WHERE ') + 'action = ?';   args.push(action); }
  if (username) { where += (where ? ' AND ' : ' WHERE ') + 'username LIKE ?'; args.push(`%${username}%`); }

  args.push(lim, off);
  return db.prepare(
    `SELECT * FROM audit_log${where} ORDER BY timestamp DESC LIMIT ? OFFSET ?`
  ).all(...args);
}

module.exports = { log, list };
