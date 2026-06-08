'use strict';
const mc = require('./minecraft.service');
const rcon = require('./rcon.service');

// State: { lobby: { cpuProcess, cpuSystem, heapUsedMb, heapTotalMb, ramUsedMb, ramTotalMb, msptMedian, source, updatedAt } }
const state = { lobby: {}, game: {} };

// History: ring buffers of last 720 points (60 min at 5s tick)
const HISTORY_MAX = 720;
const history = {
  lobby: { tps: [], mspt: [], cpuProcess: [], heapPct: [] },
  game:  { tps: [], mspt: [], cpuProcess: [], heapPct: [] },
};

function pushHistory(serverId, point) {
  const h = history[serverId];
  if (!h) return;
  const ts = Math.floor(Date.now() / 1000);
  for (const key of Object.keys(point)) {
    if (point[key] == null) continue;
    h[key].push({ t: ts, v: point[key] });
    if (h[key].length > HISTORY_MAX) h[key].shift();
  }
}

function getHistory(serverId, range = 3600) {
  const h = history[serverId];
  if (!h) return null;
  const cutoff = Math.floor(Date.now() / 1000) - range;
  return {
    tps:        h.tps.filter(p => p.t >= cutoff),
    mspt:       h.mspt.filter(p => p.t >= cutoff),
    cpuProcess: h.cpuProcess.filter(p => p.t >= cutoff),
    heapPct:    h.heapPct.filter(p => p.t >= cutoff),
  };
}

// Per-server config for simulated metrics
const SIM_CONFIG = {
  lobby: { heapTotal: 4096,  ramTotal: 16384, baseCpu: 8,  baseHeap: 0.30 },
  game:  { heapTotal: 16384, ramTotal: 32768, baseCpu: 25, baseHeap: 0.55 },
};

// Smooth value noise for organic drift
function hash01(n) {
  n = (n ^ 61) ^ (n >>> 16);
  n = (n + (n << 3)) | 0;
  n = n ^ (n >>> 4);
  n = Math.imul(n, 0x27d4eb2d);
  n = n ^ (n >>> 15);
  return ((n >>> 0) % 100000) / 100000;
}
function smoothNoise(t, bucketSec) {
  const b = Math.floor(t / bucketSec);
  const f = (t / bucketSec) - b;
  const u = f * f * (3 - 2 * f);
  const a = hash01(b);
  const c = hash01(b + 1);
  return a * (1 - u) + c * u;
}

function simulate(serverId, playerCount) {
  const cfg = SIM_CONFIG[serverId];
  const ts = Math.floor(Date.now() / 1000);
  const seed = ts + (serverId === 'lobby' ? 0 : 3333);

  // CPU: base + load factor + noise
  const loadFactor = Math.min(1, playerCount / 500);
  const cpuNoise   = (smoothNoise(seed, 90) - 0.5) * 20; // ±10%
  const cpuProcess = Math.max(2, Math.min(95, cfg.baseCpu + loadFactor * 35 + cpuNoise));

  // Heap: usage grows with players, occasional GC drops
  const gcCycle = smoothNoise(seed, 60);  // 0..1
  const heapFraction = Math.max(0.15, Math.min(0.88,
    cfg.baseHeap + loadFactor * 0.30 + (gcCycle - 0.5) * 0.15
  ));
  const heapUsed = Math.round(cfg.heapTotal * heapFraction);

  // System RAM
  const ramFraction = Math.max(0.35, Math.min(0.85,
    0.55 + loadFactor * 0.20 + (smoothNoise(seed, 300) - 0.5) * 0.1
  ));
  const ramUsed = Math.round(cfg.ramTotal * ramFraction);

  // MSPT — small fluctuation around 3-8ms when healthy
  const mspt = 3 + smoothNoise(seed, 30) * 5;

  return {
    cpuProcess: +cpuProcess.toFixed(1),
    cpuSystem:  +Math.min(100, cpuProcess + smoothNoise(seed, 120) * 30).toFixed(1),
    heapUsedMb: heapUsed,
    heapTotalMb: cfg.heapTotal,
    ramUsedMb: ramUsed,
    ramTotalMb: cfg.ramTotal,
    msptMedian: +mspt.toFixed(2),
    source: 'sim',
    updatedAt: Date.now(),
  };
}

async function refresh(serverId, ctx = {}) {
  const { online, players } = ctx;
  if (!online) {
    state[serverId] = { source: 'offline', updatedAt: Date.now() };
    return;
  }

  // Optional: try spark health if explicitly enabled
  if (process.env.SPARK_ENABLED === 'true' && rcon.isConnected(serverId)) {
    const health = await mc.getSparkHealth(serverId);
    if (health) {
      state[serverId] = { ...health, source: 'spark', updatedAt: Date.now() };
      return;
    }
  }

  // Use simulation
  state[serverId] = simulate(serverId, players || 0);

  // Record history
  const h = state[serverId];
  const heapPct = h.heapTotalMb ? (h.heapUsedMb / h.heapTotalMb) * 100 : null;
  pushHistory(serverId, {
    tps: ctx.tps,
    mspt: h.msptMedian,
    cpuProcess: h.cpuProcess,
    heapPct,
  });
}

function get(serverId) {
  return state[serverId] || null;
}

function getAll() {
  return state;
}

module.exports = { refresh, get, getAll, getHistory };
