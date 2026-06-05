'use strict';
const db = require('../db/database');

const KEY = 'total_registered';
let total = null;
let dirty = false;

function init() {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(KEY);
  if (row && row.value) {
    total = parseInt(row.value, 10);
  } else {
    total = 200000 + Math.floor(Math.random() * 50000); // 200k..250k
    persist();
  }
}

function persist() {
  if (total === null) return;
  db.prepare('INSERT OR REPLACE INTO meta(key, value) VALUES(?, ?)').run(KEY, String(total));
  dirty = false;
}

// Called from stats fastTick (every 5s)
function tick() {
  if (total === null) init();
  // Random small bumps to simulate new registrations
  const roll = Math.random();
  let inc = 0;
  if (roll < 0.55) inc = 1;            // 55% chance: +1 (typical)
  else if (roll < 0.75) inc = 0;       // 20% chance: nothing
  else if (roll < 0.92) inc = 2;       // 17% chance: +2
  else inc = 3 + Math.floor(Math.random() * 4); // 8% chance: +3..+6 burst
  total += inc;
  dirty = true;
}

function get() {
  if (total === null) init();
  return total;
}

// Persist every 60s if changed (avoid DB write each tick)
setInterval(() => { if (dirty) persist(); }, 60000);

module.exports = { init, tick, get };
