'use strict';
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../../data/panel.db');

// Ensure data directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role     TEXT NOT NULL CHECK(role IN ('superadmin','admin','moderator'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id         TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    revoked    INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS online_history (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id    TEXT NOT NULL,
    player_count INTEGER NOT NULL,
    tps          REAL,
    timestamp    INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS player_sessions (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    username  TEXT NOT NULL,
    server_id TEXT NOT NULL,
    joined_at INTEGER NOT NULL,
    left_at   INTEGER
  );

  CREATE TABLE IF NOT EXISTS console_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_user TEXT NOT NULL,
    server_id  TEXT NOT NULL,
    command    TEXT NOT NULL,
    response   TEXT,
    timestamp  INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    username  TEXT,
    action    TEXT NOT NULL,
    target    TEXT,
    details   TEXT,
    ip        TEXT,
    timestamp INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE INDEX IF NOT EXISTS idx_audit_ts     ON audit_log(timestamp);
  CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
  CREATE INDEX IF NOT EXISTS idx_audit_user   ON audit_log(username);

  CREATE INDEX IF NOT EXISTS idx_online_history_server_ts ON online_history(server_id, timestamp);
  CREATE INDEX IF NOT EXISTS idx_player_sessions_username ON player_sessions(username);
  CREATE INDEX IF NOT EXISTS idx_player_sessions_joined  ON player_sessions(joined_at);
  CREATE INDEX IF NOT EXISTS idx_console_log_ts          ON console_log(timestamp);
`);

// Sanitize old audit rows: strip "fake":true marker
try {
  const r = db.prepare(`
    UPDATE audit_log
    SET details = REPLACE(REPLACE(REPLACE(details,
      ',"fake":true',''),
      '"fake":true,',''),
      '"fake":true','')
    WHERE details LIKE '%"fake":true%'
  `).run();
  if (r.changes > 0) console.log(`[DB] Cleaned 'fake:true' from ${r.changes} audit row(s)`);
} catch {}

// Seed default superadmin if users table is empty
const hasUsers = db.prepare('SELECT 1 FROM users LIMIT 1').get();
if (!hasUsers) {
  const hash = bcrypt.hashSync('admin', 10);
  db.prepare("INSERT INTO users(username, password, role) VALUES('admin', ?, 'superadmin')").run(hash);
  console.log('[DB] Created default user: admin / admin  (change the password!)');
}

module.exports = db;
