'use strict';
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const audit = require('../services/audit.service');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

// List users (superadmin only)
router.get('/', requireAuth, requireRole('superadmin'), (req, res) => {
  const users = db.prepare('SELECT id, username, role FROM users ORDER BY id').all();
  res.json(users);
});

// Create user (superadmin only)
router.post('/', requireAuth, requireRole('superadmin'), async (req, res) => {
  const { username, password, role } = req.body || {};
  if (!username || !password || !role) return res.status(400).json({ error: 'Все поля обязательны' });
  if (!['superadmin', 'admin', 'moderator'].includes(role)) return res.status(400).json({ error: 'Неверная роль' });
  if (password.length < 6) return res.status(400).json({ error: 'Пароль минимум 6 символов' });

  const exists = db.prepare('SELECT 1 FROM users WHERE username=?').get(username);
  if (exists) return res.status(409).json({ error: 'Логин уже занят' });

  const hash = await bcrypt.hash(password, 10);
  const r = db.prepare('INSERT INTO users(username, password, role) VALUES(?,?,?)').run(username, hash, role);
  audit.log(req, 'user_created', String(r.lastInsertRowid), { new_username: username, role });
  res.json({ ok: true, id: r.lastInsertRowid });
});

// Delete user (superadmin only, cannot delete self)
router.delete('/:id', requireAuth, requireRole('superadmin'), (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (id === req.user.id) return res.status(400).json({ error: 'Нельзя удалить себя' });
  const target = db.prepare('SELECT username FROM users WHERE id=?').get(id);
  const r = db.prepare('DELETE FROM users WHERE id=?').run(id);
  if (r.changes === 0) return res.status(404).json({ error: 'Пользователь не найден' });
  audit.log(req, 'user_deleted', String(id), { deleted_username: target?.username });
  res.json({ ok: true });
});

// Change own password
router.post('/change-password', requireAuth, async (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Все поля обязательны' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Пароль минимум 6 символов' });

  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  const ok = await bcrypt.compare(oldPassword, user.password);
  if (!ok) return res.status(400).json({ error: 'Текущий пароль неверный' });

  const hash = await bcrypt.hash(newPassword, 10);
  db.prepare('UPDATE users SET password=? WHERE id=?').run(hash, req.user.id);
  db.prepare('UPDATE sessions SET revoked=1 WHERE user_id=?').run(req.user.id);
  audit.log(req, 'password_changed', String(req.user.id));
  res.json({ ok: true });
});

module.exports = router;
