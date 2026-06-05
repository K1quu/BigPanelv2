'use strict';
/**
 * Fake player simulation:
 *  - Maintains a pool of fake online players across lobby/game
 *  - Realistic Minecraft-style nicknames generated procedurally
 *  - Slowly add/remove and migrate between servers to look alive
 */

const PREFIXES = [
  'Shadow','Dark','Light','Cyber','Pixel','Pro','Neo','Cool','Mister','Crazy','Lucky','Mighty',
  'Iron','Stone','Wood','Diamond','Gold','Lava','Fire','Ice','Storm','Sky','Sun','Moon','Star',
  'Red','Blue','Green','Black','White','Silver','Crimson','Toxic','Frozen','Burning','Wild',
  'Silent','Loud','Fast','Slow','Tiny','Mega','Ultra','Hyper','Super','Mini','Big','Old','New',
  'Lord','King','Queen','Boss','Ghost','Phantom','Ninja','Hunter','Killer','Warrior','Knight',
  'Demon','Angel','Dragon','Wolf','Bear','Lion','Tiger','Falcon','Eagle','Hawk','Raven','Snake',
  'Vlad','Igor','Slava','Anton','Sasha','Pasha','Misha','Vasya','Dima','Kostya','Yura','Tolya',
];

const SUFFIXES = [
  'Gamer','Player','Master','Killer','Slayer','Hunter','Warrior','Knight','Wizard','Mage','Lord',
  'King','Boss','Ninja','Samurai','Pirate','Viking','Hero','Legend','Pro','Noob','God','Demon',
  'Dragon','Wolf','Bear','Lion','Tiger','Eagle','Falcon','Hawk','Phantom','Ghost','Shadow',
  'Smith','Black','White','Stone','Iron','Steel','Fire','Ice','Storm','Thunder','Light','Dark',
  'X','XD','TV','YT','PRO','OP','MC','BG','RU','RUS',
];

const ENDINGS = ['', '', '', '', '_', 'YT', 'TV', 'OP', 'PRO', 'XD', '228', '777', '666', '52', '24', '13', '01', '99', '17', '03', '21'];

function randInt(n) { return Math.floor(Math.random() * n); }
function pick(arr) { return arr[randInt(arr.length)]; }

function generateNickname() {
  const pat = randInt(5);
  let n;
  if (pat === 0)      n = pick(PREFIXES) + pick(SUFFIXES);
  else if (pat === 1) n = pick(PREFIXES) + '_' + pick(SUFFIXES);
  else if (pat === 2) n = pick(PREFIXES) + (10 + randInt(990));
  else if (pat === 3) n = pick(SUFFIXES) + pick(ENDINGS) + (randInt(100));
  else                n = pick(PREFIXES) + pick(SUFFIXES) + pick(ENDINGS);
  if (n.length > 16) n = n.slice(0, 16);
  return n;
}

// Map<nickname, {server_id, joined_at}>
const fakePlayers = new Map();

// Smoothly drifting lobby target around 50-100, with rare fluctuations
let lobbyTargetState = 75;
let nextLobbyShiftAt = 0;

function distribute(targetTotal) {
  // Lobby: stays in 50-100 range, drifts slowly (changes target every ~60s)
  const now = Date.now();
  if (now >= nextLobbyShiftAt) {
    lobbyTargetState = 50 + Math.round(Math.random() * 50); // 50..100
    nextLobbyShiftAt = now + (45 + Math.random() * 60) * 1000;
  }

  // If total too small to support both — give lobby a fair share
  let lobby = lobbyTargetState;
  if (targetTotal < 250) lobby = Math.round(targetTotal * 0.25);
  if (lobby > targetTotal) lobby = targetTotal;

  const game = Math.max(0, targetTotal - lobby);
  return { lobby, game };
}

function countBy(serverId) {
  let c = 0;
  for (const p of fakePlayers.values()) if (p.server_id === serverId) c++;
  return c;
}

function addPlayer(serverId, now) {
  let name;
  let tries = 0;
  do {
    name = generateNickname();
    if (++tries > 10) { name = name + randInt(999); break; }
  } while (fakePlayers.has(name));
  fakePlayers.set(name, { server_id: serverId, joined_at: Math.floor(now / 1000) });
}

function removeOne(serverId) {
  for (const [name, p] of fakePlayers) {
    if (p.server_id === serverId) {
      fakePlayers.delete(name);
      return;
    }
  }
}

function migrate(count) {
  // Move a few random players between lobby and game
  const movers = [...fakePlayers.entries()];
  for (let i = 0; i < count && movers.length > 0; i++) {
    const idx = randInt(movers.length);
    const [name, p] = movers.splice(idx, 1)[0];
    p.server_id = p.server_id === 'lobby' ? 'game' : 'lobby';
  }
}

/**
 * Sync fake players to target count. Adjust gradually — no more than ±15 per tick.
 */
function sync(totalTarget, now) {
  const { lobby: lobbyTarget, game: gameTarget } = distribute(totalTarget);
  const lobbyHave = countBy('lobby');
  const gameHave  = countBy('game');

  const lobbyDelta = lobbyTarget - lobbyHave;
  const gameDelta  = gameTarget  - gameHave;

  // Smooth changes — but allow big jumps when far from target (startup catch-up)
  function stepFor(delta) {
    const abs = Math.abs(delta);
    if (abs > 500) return Math.sign(delta) * 200;  // huge gap — fast catch-up
    if (abs > 100) return Math.sign(delta) * 40;
    if (abs > 30)  return Math.sign(delta) * 15;
    return Math.sign(delta) * Math.min(abs, 5);     // near target — gentle drift
  }
  const lobbyStep = stepFor(lobbyDelta);
  const gameStep  = stepFor(gameDelta);

  for (let i = 0; i < Math.abs(lobbyStep); i++) {
    if (lobbyStep > 0) addPlayer('lobby', now); else removeOne('lobby');
  }
  for (let i = 0; i < Math.abs(gameStep); i++) {
    if (gameStep > 0) addPlayer('game', now); else removeOne('game');
  }

  // Occasionally migrate a couple players to look alive
  if (Math.random() < 0.3) migrate(1 + randInt(3));
}

function getCount(serverId) {
  return countBy(serverId);
}

function getPlayers({ search = '', server = null, limit = 200, offset = 0 } = {}) {
  const out = [];
  const needle = search.toLowerCase();
  for (const [username, p] of fakePlayers) {
    if (server && p.server_id !== server) continue;
    if (needle && !username.toLowerCase().includes(needle)) continue;
    out.push({ username, server_id: p.server_id, joined_at: p.joined_at });
  }
  out.sort((a, b) => b.joined_at - a.joined_at);
  return out.slice(offset, offset + limit);
}

function getTotal() {
  return fakePlayers.size;
}

function remove(username) {
  return fakePlayers.delete(username);
}

module.exports = { sync, getCount, getPlayers, getTotal, remove };
