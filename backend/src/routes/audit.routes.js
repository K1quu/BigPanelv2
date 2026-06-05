'use strict';
const router = require('express').Router();
const audit = require('../services/audit.service');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

// Superadmin only — view all audit logs
router.get('/', requireAuth, requireRole('superadmin'), (req, res) => {
  const { action, username, limit, offset } = req.query;
  res.json(audit.list({ action, username, limit, offset }));
});

module.exports = router;
