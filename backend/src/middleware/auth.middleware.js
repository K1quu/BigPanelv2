'use strict';
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const crypto = require('crypto');

function hashToken(t) {
  return crypto.createHash('sha256').update(t).digest('hex');
}

function requireAuth(req, res, next) {
  const cookie = req.cookies && req.cookies.token;
  const header = req.headers.authorization;
  const token = cookie || (header && header.startsWith('Bearer ') ? header.slice(7) : null);
  if (!token) return res.status(401).json({ error: 'Требуется авторизация' });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET || 'secret');
  } catch {
    return res.status(401).json({ error: 'Недействительный токен' });
  }

  const sess = db.prepare('SELECT * FROM sessions WHERE id=?').get(payload.sid);
  if (!sess || sess.revoked || sess.expires_at < Date.now()) {
    return res.status(401).json({ error: 'Сессия истекла' });
  }
  if (sess.token_hash !== hashToken(token)) {
    return res.status(401).json({ error: 'Токен недействителен' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id=?').get(payload.uid);
  if (!user) return res.status(401).json({ error: 'Пользователь не найден' });

  req.user = user;
  req.token = token;
  next();
}

const ROLE_RANK = { moderator: 1, admin: 2, superadmin: 3 };

function requireRole(minRole) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Требуется авторизация' });
    if ((ROLE_RANK[req.user.role] || 0) < (ROLE_RANK[minRole] || 99)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole, ROLE_RANK };
