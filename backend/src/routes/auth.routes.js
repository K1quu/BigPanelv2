'use strict';
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth.middleware');

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  maxAge: 12 * 3600 * 1000,
};

function hashToken(t) {
  return crypto.createHash('sha256').update(t).digest('hex');
}

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Введите логин и пароль' });

  const user = db.prepare('SELECT * FROM users WHERE username=?').get(String(username).trim());
  if (!user) return res.status(401).json({ error: 'Неверный логин или пароль' });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: 'Неверный логин или пароль' });

  const sessionId = crypto.randomBytes(16).toString('hex');
  const secret = process.env.JWT_SECRET || 'secret';
  const token = jwt.sign({ uid: user.id, sid: sessionId, role: user.role }, secret, { expiresIn: '12h' });
  const expiresAt = Date.now() + 12 * 3600 * 1000;

  db.prepare(
    'INSERT INTO sessions(id, user_id, token_hash, expires_at) VALUES(?,?,?,?)'
  ).run(sessionId, user.id, hashToken(token), expiresAt);

  res.cookie('token', token, COOKIE_OPTS);
  res.json({ ok: true, user: { id: user.id, username: user.username, role: user.role } });
});

router.post('/logout', requireAuth, (req, res) => {
  const payload = jwt.decode(req.token);
  if (payload && payload.sid) {
    db.prepare('UPDATE sessions SET revoked=1 WHERE id=?').run(payload.sid);
  }
  res.clearCookie('token');
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  const { id, username, role } = req.user;
  res.json({ id, username, role });
});

module.exports = router;
