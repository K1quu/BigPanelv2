'use strict';

const STARTED_AT = Math.floor(Date.now() / 1000);

// Base plugin lists per server, with relative CPU weight (% of total CPU consumed)
const PLUGINS = {
  lobby: [
    { name: 'EssentialsX',     weight: 18, memMb: 64  },
    { name: 'LuckPerms',       weight: 12, memMb: 48  },
    { name: 'WorldEdit',       weight: 8,  memMb: 38  },
    { name: 'AuthMe',          weight: 14, memMb: 56  },
    { name: 'ProtocolLib',     weight: 16, memMb: 72  },
    { name: 'BungeeCordSync',  weight: 9,  memMb: 24  },
    { name: 'PlaceholderAPI',  weight: 7,  memMb: 32  },
    { name: 'Vault',           weight: 4,  memMb: 18  },
    { name: 'HolographicDisplays', weight: 6, memMb: 26 },
    { name: 'NametagEdit',     weight: 3,  memMb: 14  },
    { name: 'DiscordSRV',      weight: 8,  memMb: 42  },
    { name: 'Citizens',        weight: 11, memMb: 48  },
  ],
  game: [
    { name: 'EssentialsX',     weight: 14, memMb: 96  },
    { name: 'LuckPerms',       weight: 10, memMb: 64  },
    { name: 'WorldGuard',      weight: 22, memMb: 180 },
    { name: 'WorldEdit',       weight: 12, memMb: 88  },
    { name: 'ProtocolLib',     weight: 18, memMb: 120 },
    { name: 'CoreProtect',     weight: 16, memMb: 240 },
    { name: 'mcMMO',           weight: 13, memMb: 112 },
    { name: 'PlaceholderAPI',  weight: 8,  memMb: 48  },
    { name: 'Citizens',        weight: 11, memMb: 76  },
    { name: 'AuthMe',          weight: 9,  memMb: 64  },
    { name: 'Vault',           weight: 4,  memMb: 22  },
    { name: 'DiscordSRV',      weight: 10, memMb: 56  },
    { name: 'Multiverse-Core', weight: 6,  memMb: 38  },
    { name: 'ChestShop',       weight: 7,  memMb: 44  },
    { name: 'PlugMan',         weight: 2,  memMb: 12  },
  ],
};

// Smooth noise (shared)
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

/**
 * Distribute totalCpuPct across plugins, weighted by their base weight.
 * Adds individual fluctuation per plugin so percentages drift naturally.
 */
function getPluginBreakdown(serverId, totalCpuPct) {
  const list = PLUGINS[serverId] || [];
  const ts = Math.floor(Date.now() / 1000);
  const totalWeight = list.reduce((a, p) => a + p.weight, 0);

  // Reserve ~25% of CPU as "untracked / server core" — plugins get 75%
  const pluginsCpu = totalCpuPct * 0.75;

  const result = list.map((p, i) => {
    // Individual noise per plugin (different seed per index)
    const fluct = (smoothNoise(ts + i * 1009, 45) - 0.5) * 0.4; // ±20%
    const pct = (p.weight / totalWeight) * pluginsCpu * (1 + fluct);
    // Memory also fluctuates slightly
    const memFluct = (smoothNoise(ts + i * 1213, 90) - 0.5) * 0.1;
    return {
      name: p.name,
      cpuPercent: +Math.max(0.1, pct).toFixed(2),
      memMb: Math.round(p.memMb * (1 + memFluct)),
    };
  });

  // Sort descending
  result.sort((a, b) => b.cpuPercent - a.cpuPercent);
  return result;
}

function getNetwork(serverId, players) {
  const ts = Math.floor(Date.now() / 1000);
  const seed = ts + (serverId === 'lobby' ? 0 : 5555);
  // Bandwidth per player: ~20-80 KB/s with traffic patterns
  const perPlayerKbps = 20 + smoothNoise(seed, 60) * 60;
  const rxKbps = Math.round(players * perPlayerKbps * 0.4);   // incoming = ~40% per player
  const txKbps = Math.round(players * perPlayerKbps * 1.2);   // outgoing = larger (world data, blocks)
  return { rxKbps, txKbps, perPlayerKbps: +perPlayerKbps.toFixed(1) };
}

function getUptime(serverId) {
  // Pretend each server has its own uptime tied to panel startup
  // (with a small offset so they're not exactly the same)
  const offset = serverId === 'lobby' ? 3600 : 7200;
  return Math.floor(Date.now() / 1000) - STARTED_AT + offset;
}

function getAvgPing(players) {
  // Random base 35-85ms, fluctuates
  const ts = Math.floor(Date.now() / 1000);
  const base = 40 + smoothNoise(ts, 30) * 35;
  // Slight increase under load
  const loadFactor = Math.min(1, players / 1000);
  return +(base + loadFactor * 25).toFixed(1);
}

module.exports = { getPluginBreakdown, getNetwork, getUptime, getAvgPing };
