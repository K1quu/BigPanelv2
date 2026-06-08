# MC Panel — Панель администрирования кластера Minecraft-серверов

## 1. Назначение и контекст

**MC Panel** — это веб-приложение для централизованного администрирования кластера игровых серверов Minecraft. Программный продукт предназначен для команды операторов, обслуживающих многосерверный игровой проект, состоящий из proxy-сервера Velocity и нескольких backend-серверов на ядре Patina (форк Paper).

Система решает следующие задачи:

- Мониторинг состояния серверов (онлайн, TPS, MSPT, использование CPU и памяти)
- Управление жизненным циклом контейнеров серверов (запуск, остановка, перезапуск)
- Удалённое исполнение команд через протокол RCON
- Просмотр и поиск онлайн-игроков, истории сессий
- Управление учётными записями операторов и разграничение прав доступа
- Ведение полного журнала действий администраторов
- Просмотр загруженных плагинов и игровых миров

## 2. Архитектура системы

Приложение построено по классической трёхзвенной архитектуре:

```
┌─────────────────────────────────────────────────────────────┐
│                  Браузер (React SPA)                         │
│  Компоненты, маршрутизация, WebSocket-клиент                 │
└───────────────────┬─────────────────────────────────────────┘
                    │ HTTP (REST) + WebSocket
                    │ httpOnly cookie с JWT
┌───────────────────▼─────────────────────────────────────────┐
│              Node.js Backend (Express)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │ Routes   │  │ Services │  │   Auth   │  │ WebSocket  │  │
│  │ (REST)   │  │ (логика) │  │ (JWT+    │  │ сервер     │  │
│  │          │  │          │  │  bcrypt) │  │            │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘  │
└──┬──────────────┬──────────────┬──────────────┬─────────────┘
   │              │              │              │
   ▼              ▼              ▼              ▼
┌──────┐    ┌─────────┐    ┌─────────┐    ┌──────────────┐
│SQLite│    │  RCON   │    │ Docker  │    │  Minecraft   │
│ (БД) │    │ клиент  │    │  CLI    │    │  Server List │
│      │    │ (TCP)   │    │ (exec)  │    │  Ping (SLP)  │
└──────┘    └────┬────┘    └────┬────┘    └──────┬───────┘
                 │              │                 │
                 ▼              ▼                 ▼
            ┌────────────────────────────────────────┐
            │  Игровые серверы Minecraft в Docker    │
            │  (Velocity, Lobby-1, Lite-1)           │
            └────────────────────────────────────────┘
```

Backend и frontend работают как разные процессы во время разработки (`vite dev` + `node`), но в продакшене frontend компилируется в статические файлы и раздаётся тем же Express-сервером по одному порту 3001.

## 3. Технологический стек

### Backend

| Технология | Версия | Назначение |
|---|---|---|
| Node.js | 22+ | Среда исполнения |
| Express | 4.19 | HTTP-сервер и маршрутизация |
| node:sqlite | встроенный | СУБД (без нативных зависимостей) |
| ws | 8.17 | WebSocket-сервер |
| jsonwebtoken | 9.0 | Подпись JWT-токенов |
| bcryptjs | 2.4 | Хэширование паролей |
| rcon-client | 4.2 | Клиент протокола RCON |
| minecraft-server-util | 5.4 | Server List Ping |
| cookie-parser | 1.4 | Парсинг httpOnly cookies |
| dotenv | 16.4 | Загрузка переменных окружения |

### Frontend

| Технология | Версия | Назначение |
|---|---|---|
| React | 18.3 | UI-библиотека |
| Vite | 5.3 | Сборщик и dev-сервер |
| React Router | 6.24 | Клиентская маршрутизация |
| TailwindCSS | 3.4 | Утилитарные CSS-классы |
| Axios | 1.7 | HTTP-клиент с поддержкой httpOnly cookies |
| Lucide React | 0.395 | Векторные иконки |

### Обоснование выбора

- **SQLite (через node:sqlite)** — встроенная в Node.js 22+ СУБД не требует внешнего сервера БД и компиляции нативных модулей (в отличие от `better-sqlite3`). Это упрощает развёртывание и эксплуатацию.
- **Express вместо Fastify/Koa** — наиболее широко поддерживаемый фреймворк, большая экосистема middleware, низкий порог входа для будущих разработчиков.
- **JWT в httpOnly cookie** — более безопасное хранение токенов, чем localStorage, поскольку защищает от XSS-атак.
- **TailwindCSS** — позволяет реализовывать единый дизайн без дублирования CSS, минимальный итоговый bundle благодаря purge неиспользуемых классов.
- **React + Vite** — быстрая сборка благодаря esbuild, hot module replacement в разработке, готовый toolchain для production-сборки.

## 4. Структура проекта

```
mc-panel/
├── backend/
│   ├── package.json
│   ├── .env.example                    # шаблон конфигурации
│   └── src/
│       ├── index.js                    # точка входа — Express + WS
│       ├── events.js                   # глобальный EventEmitter
│       ├── ws.js                       # WebSocket-сервер
│       ├── db/
│       │   └── database.js             # инициализация БД, миграции
│       ├── middleware/
│       │   └── auth.middleware.js      # requireAuth, requireRole
│       ├── routes/
│       │   ├── auth.routes.js          # /api/auth
│       │   ├── servers.routes.js       # /api/servers
│       │   ├── players.routes.js       # /api/players
│       │   ├── stats.routes.js         # /api/stats
│       │   ├── console.routes.js       # /api/console
│       │   ├── plugins.routes.js       # /api/plugins
│       │   ├── worlds.routes.js        # /api/worlds
│       │   ├── users.routes.js         # /api/users
│       │   ├── audit.routes.js         # /api/audit
│       │   └── debug.routes.js         # /api/debug
│       └── services/
│           ├── rcon.service.js         # RCON-клиент с переподключением
│           ├── minecraft.service.js    # SLP-ping, парсинг ответов RCON
│           ├── docker.service.js       # обёртка над `docker` CLI
│           ├── stats.service.js        # сбор метрик, fast/slow tick
│           ├── health.service.js       # CPU, память, MSPT
│           ├── serverstats.service.js  # сетевая статистика, плагины
│           ├── fakeplayers.service.js  # симуляция распределения игроков
│           ├── registered.service.js   # счётчик базы игроков
│           └── audit.service.js        # запись событий в журнал
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── index.html
│   ├── public/
│   │   └── logo.svg
│   └── src/
│       ├── main.jsx                    # точка монтирования React
│       ├── App.jsx                     # роутинг, AuthContext
│       ├── index.css                   # глобальные стили + Tailwind
│       ├── services/
│       │   ├── api.js                  # axios с baseURL и cookie
│       │   └── websocket.js            # WS-клиент с переподключением
│       ├── components/
│       │   ├── Sidebar.jsx
│       │   ├── Logo.jsx
│       │   ├── ServerCard.jsx
│       │   ├── PlayerTable.jsx
│       │   ├── OnlineChart.jsx         # большой график на дашборде
│       │   ├── MiniChart.jsx           # мини-графики метрик
│       │   └── ConsoleTerminal.jsx
│       └── pages/
│           ├── Login.jsx
│           ├── Dashboard.jsx
│           ├── Servers.jsx
│           ├── ServerDetail.jsx
│           ├── Players.jsx
│           ├── Console.jsx
│           ├── Plugins.jsx
│           ├── Worlds.jsx
│           └── Users.jsx
├── data/
│   └── panel.db                        # SQLite-база (создаётся автоматически)
├── package.json                        # корневые скрипты dev/build/start
├── DEPLOY.md                           # инструкция развёртывания
└── README.md
```

## 5. Структура базы данных

База данных хранится в одном файле `data/panel.db`. Используется режим WAL (Write-Ahead Logging) для повышения производительности конкурентных операций чтения. Внешние ключи включены через `PRAGMA foreign_keys = ON`.

### 5.1 Схема таблиц

```sql
-- Учётные записи операторов панели
CREATE TABLE users (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,                              -- bcrypt-хэш
    role     TEXT NOT NULL CHECK(role IN
             ('superadmin','admin','moderator'))
);

-- Сессии авторизации (одна запись на устройство)
CREATE TABLE sessions (
    id         TEXT PRIMARY KEY,                        -- случайный ID
    user_id    INTEGER NOT NULL,
    token_hash TEXT NOT NULL,                           -- SHA-256 от JWT
    expires_at INTEGER NOT NULL,                        -- UNIX timestamp
    revoked    INTEGER NOT NULL DEFAULT 0
);

-- Снимки онлайна для построения графиков (тик каждые 30с)
CREATE TABLE online_history (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id    TEXT NOT NULL,                         -- 'velocity'|'lobby'|'game'
    player_count INTEGER NOT NULL,
    tps          REAL,
    timestamp    INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Игровые сессии игроков (для аналитики и истории)
CREATE TABLE player_sessions (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    username  TEXT NOT NULL,
    server_id TEXT NOT NULL,
    joined_at INTEGER NOT NULL,
    left_at   INTEGER                                   -- NULL = всё ещё онлайн
);

-- Лог команд RCON
CREATE TABLE console_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_user TEXT NOT NULL,
    server_id  TEXT NOT NULL,
    command    TEXT NOT NULL,
    response   TEXT,
    timestamp  INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Журнал аудита (все мутирующие действия)
CREATE TABLE audit_log (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    username  TEXT,                                     -- кто
    action    TEXT NOT NULL,                            -- что (login, server_stop, ...)
    target    TEXT,                                     -- над чем (id сущности)
    details   TEXT,                                     -- JSON-метаданные
    ip        TEXT,
    timestamp INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Метаданные приложения (ключ-значение)
CREATE TABLE meta (
    key   TEXT PRIMARY KEY,
    value TEXT
);
```

### 5.2 Индексы

Все часто запрашиваемые поля покрыты индексами:

```sql
CREATE INDEX idx_online_history_server_ts ON online_history(server_id, timestamp);
CREATE INDEX idx_player_sessions_username ON player_sessions(username);
CREATE INDEX idx_player_sessions_joined   ON player_sessions(joined_at);
CREATE INDEX idx_console_log_ts           ON console_log(timestamp);
CREATE INDEX idx_audit_ts                 ON audit_log(timestamp);
CREATE INDEX idx_audit_action             ON audit_log(action);
CREATE INDEX idx_audit_user               ON audit_log(username);
```

### 5.3 Миграции

Миграции выполняются автоматически при старте приложения через `CREATE TABLE IF NOT EXISTS`. Это гарантирует, что схема всегда соответствует ожидаемой версии, без необходимости запускать отдельные скрипты.

При первом запуске создаётся учётная запись по умолчанию:
```javascript
const hasUsers = db.prepare('SELECT 1 FROM users LIMIT 1').get();
if (!hasUsers) {
    const hash = bcrypt.hashSync('admin', 10);
    db.prepare("INSERT INTO users(username, password, role) VALUES('admin', ?, 'superadmin')").run(hash);
}
```

## 6. Серверная часть

### 6.1 Точка входа

`backend/src/index.js` — линейный bootstrap:

```javascript
require('dotenv').config();
require('./db/database');                              // создаёт таблицы

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth',    require('./routes/auth.routes'));
app.use('/api/servers', require('./routes/servers.routes'));
// ... остальные маршруты

attachWss(server);                                      // WebSocket
rcon.init();                                            // подключение к RCON
startStats();                                           // запуск тиков мониторинга

server.listen(process.env.PORT || 3001);
```

### 6.2 Маршрутизация (Routes)

Каждый ресурс выделен в отдельный модуль `routes/*.routes.js`. Маршруты применяют middleware авторизации и валидации:

```javascript
router.post('/:id/restart',
    requireAuth,
    requireRole('admin'),
    async (req, res) => {
        try {
            const out = await docker.restart(req.params.id);
            audit.log(req, 'server_restart', req.params.id);
            res.json({ ok: true, message: out });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
);
```

### 6.3 Сервисный слой (Services)

Бизнес-логика инкапсулирована в сервисах. Маршруты не содержат прямых обращений к БД или внешним системам — они делегируют сервисам.

#### RCON-сервис с автоматическим переподключением

```javascript
class RconConnection {
    constructor(id, host, port, password) { /* ... */ }

    async connect() {
        try {
            this.rcon = new Rcon({ host, port, password, timeout: 5000 });
            await this.rcon.connect();
            this.connected = true;
        } catch (err) {
            this.connected = false;
            setTimeout(() => this.connect(), 15000);     // ретрай
        }
    }

    async send(command) {
        if (!this.connected) throw new Error('RCON not connected');
        return this.rcon.send(command);
    }
}
```

#### Парсинг ответов сервера

Сервер Patina выдаёт команды в локализованном формате, поэтому парсер устойчив к разным вариантам:

```javascript
function parsePlayerList(rconResponse) {
    const clean = stripColorCodes(rconResponse);

    // Английский формат: "Players online: name1, name2"
    const en = clean.match(/players online:\s*(.+)/i);
    if (en) return splitNames(en[1]);

    // Русский формат с группами: "Сейчас 1 из 180...\nAdmins: K1qu"
    const names = [];
    for (const line of clean.split('\n').slice(1)) {
        const m = line.match(/^[^:]+:\s*(.+)$/);
        if (m) names.push(...splitNames(m[1]));
    }
    return names;
}
```

#### Сбор метрик: разделение быстрого и медленного цикла

Чтобы UI обновлялся почти в реальном времени, но при этом не перегружать БД, реализован двухуровневый цикл:

```javascript
function startStats() {
    // Быстрый цикл: каждые 5 секунд — ping + push в WebSocket
    setInterval(() => fastTick(), 5000);

    // Медленный цикл: каждые 30 секунд — TPS через RCON + запись истории
    setInterval(() => slowTick(), 30000);
}

async function fastTick() {
    const [velPing, lobPing, gamePing] = await Promise.all([
        mc.pingServer(VELOCITY_HOST, VELOCITY_PORT),
        mc.pingServer(LOBBY_HOST, LOBBY_PORT),
        mc.pingServer(GAME_HOST, GAME_PORT),
    ]);
    // ... обновление состояния
    events.emit('tick', { servers: Object.values(state) });
}
```

### 6.4 Слой авторизации

Используется JWT в httpOnly cookie. Подпись токена хранится в БД как SHA-256 хэш, что позволяет отзывать сессии без необходимости поддерживать blacklist на каждой проверке:

```javascript
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username=?').get(username);
    if (!user) return res.status(401).json({ error: 'Неверный логин или пароль' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Неверный логин или пароль' });

    const sessionId = crypto.randomBytes(16).toString('hex');
    const token = jwt.sign({ uid: user.id, sid: sessionId, role: user.role },
                            process.env.JWT_SECRET, { expiresIn: '12h' });

    db.prepare(`INSERT INTO sessions(id, user_id, token_hash, expires_at)
                VALUES(?,?,?,?)`)
      .run(sessionId, user.id, hashToken(token), Date.now() + 12*3600*1000);

    res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 12*3600*1000 });
    res.json({ ok: true, user: { id: user.id, username, role: user.role } });
});
```

### 6.5 Ролевая модель

Три роли с иерархией прав:

| Роль | Доступ |
|---|---|
| `moderator` | Просмотр дашборда, серверов, игроков, плагинов |
| `admin` | + RCON-консоль, управление серверами, кик/бан игроков |
| `superadmin` | + управление пользователями, журнал аудита |

Проверка через middleware:

```javascript
const ROLE_RANK = { moderator: 1, admin: 2, superadmin: 3 };

function requireRole(minRole) {
    return (req, res, next) => {
        if ((ROLE_RANK[req.user.role] || 0) < (ROLE_RANK[minRole] || 99)) {
            return res.status(403).json({ error: 'Недостаточно прав' });
        }
        next();
    };
}
```

### 6.6 WebSocket для realtime-обновлений

WebSocket-соединение использует ту же httpOnly cookie для аутентификации — на этапе HTTP-upgrade сервер проверяет JWT из заголовка `Cookie`:

```javascript
httpServer.on('upgrade', (req, socket, head) => {
    const token = parseCookies(req.headers.cookie).token;
    try { jwt.verify(token, process.env.JWT_SECRET); }
    catch { socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n'); socket.destroy(); return; }
    wss.handleUpgrade(req, socket, head, ws => {
        clients.add(ws);
        ws.on('close', () => clients.delete(ws));
    });
});

events.on('tick', payload => broadcast({ type: 'tick', ...payload }));
```

### 6.7 Аудит

Все мутирующие операции вызывают `audit.log(req, action, target, details)`. Журнал доступен только super-admin и используется для расследования инцидентов:

```javascript
function log(req, action, target = null, details = null) {
    db.prepare(`INSERT INTO audit_log(username, action, target, details, ip, timestamp)
                VALUES(?,?,?,?,?,?)`).run(
        req?.user?.username,
        action,
        target,
        details ? JSON.stringify(details) : null,
        req?.headers['x-forwarded-for']?.split(',')[0].trim() ||
        req?.socket?.remoteAddress,
        Math.floor(Date.now() / 1000),
    );
}
```

## 7. Клиентская часть

### 7.1 Маршрутизация и контекст

`App.jsx` оборачивает приложение в `AuthContext`, который содержит данные текущего пользователя. Защищённые маршруты проходят через компонент `Guard`:

```jsx
function Guard({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <Spinner />;
    return user ? children : <Navigate to="/login" replace />;
}

<Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/*" element={
        <Guard><Layout><AppRoutes /></Layout></Guard>
    } />
</Routes>
```

### 7.2 HTTP-клиент

Все запросы идут через единый экземпляр axios с автоматической отправкой cookie:

```javascript
const api = axios.create({
    baseURL: '/api',
    withCredentials: true,
});

api.interceptors.response.use(
    r => r,
    err => {
        if (err.response?.status === 401 && location.pathname !== '/login') {
            location.href = '/login';
        }
        return Promise.reject(err);
    }
);
```

### 7.3 WebSocket с автопереподключением

```javascript
export function connectWS() {
    if (ws?.readyState === WebSocket.OPEN) return;
    ws = new WebSocket(`ws://${location.host}/ws`);

    ws.onmessage = e => {
        const msg = JSON.parse(e.data);
        handlers.forEach(h => h(msg));
    };

    ws.onclose = () => {
        ws = null;
        reconnectTimer = setTimeout(connectWS, 5000);
    };
}

export function onMessage(fn) {
    handlers.add(fn);
    return () => handlers.delete(fn);
}
```

### 7.4 Графики (SVG)

Графики реализованы с нуля как React-компоненты, рендерящие SVG. Используется интерполяция Catmull-Rom с преобразованием в кубические кривые Безье для плавности:

```javascript
function smoothPath(points, tension = 0.5) {
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i - 1] || points[i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2] || p2;
        const cp1x = p1.x + (p2.x - p0.x) * tension / 6;
        const cp1y = p1.y + (p2.y - p0.y) * tension / 6;
        const cp2x = p2.x - (p3.x - p1.x) * tension / 6;
        const cp2y = p2.y - (p3.y - p1.y) * tension / 6;
        d += ` C ${cp1x},${cp1y}, ${cp2x},${cp2y}, ${p2.x},${p2.y}`;
    }
    return d;
}
```

Ширина рассчитывается через `ResizeObserver`, что обеспечивает адаптивность под любую ширину контейнера без потери чёткости (в отличие от SVG со `preserveAspectRatio="none"`, который растягивает изображение).

### 7.5 Адаптивность

Mobile-first подход через Tailwind: на телефоне сайдбар скрывается за гамбургер-меню, KPI выстраиваются в 2 колонки вместо 4, таблицы получают горизонтальный скролл.

## 8. REST API

| Метод | Endpoint | Описание | Роль |
|---|---|---|---|
| POST | `/api/auth/login` | Вход в систему | — |
| POST | `/api/auth/logout` | Выход | auth |
| GET  | `/api/auth/me` | Данные текущего пользователя | auth |
| GET  | `/api/servers` | Состояние всех серверов | auth |
| GET  | `/api/servers/:id` | Детали одного сервера | auth |
| GET  | `/api/servers/:id/details` | Расширенная статистика | auth |
| POST | `/api/servers/:id/start` | Запуск контейнера | admin |
| POST | `/api/servers/:id/stop` | Остановка контейнера | admin |
| POST | `/api/servers/:id/restart` | Перезапуск | admin |
| GET  | `/api/players` | Текущие онлайн-игроки | auth |
| GET  | `/api/players/history` | История сессий с поиском | auth |
| POST | `/api/players/kick` | Кик игрока | admin |
| POST | `/api/players/ban` | Бан игрока | admin |
| GET  | `/api/stats/online` | Снимок онлайна | auth |
| GET  | `/api/stats/history` | История за период | auth |
| GET  | `/api/stats/registered` | Счётчик базы игроков | auth |
| DELETE | `/api/stats/history` | Очистка истории графика | admin |
| POST | `/api/console/command` | Отправка команды RCON | admin |
| GET  | `/api/console/log` | Лог команд | admin |
| GET  | `/api/plugins/:serverId` | Список плагинов | auth |
| GET  | `/api/worlds/:serverId` | Список миров с размерами | auth |
| GET  | `/api/users` | Список операторов | superadmin |
| POST | `/api/users` | Создание оператора | superadmin |
| DELETE | `/api/users/:id` | Удаление оператора | superadmin |
| POST | `/api/users/change-password` | Смена своего пароля | auth |
| GET  | `/api/audit` | Журнал аудита с фильтрами | superadmin |

### 8.1 WebSocket-сообщения

| Сообщение | Содержимое | Когда |
|---|---|---|
| `tick` | `{servers: [...], registered: N}` | каждые 5 секунд |
| `player_join` | `{username, server}` | вход игрока |
| `player_leave` | `{username, server}` | выход игрока |

## 9. Интеграции с внешними системами

### 9.1 Server List Ping (SLP)

Стандартный протокол Minecraft, позволяющий получить базовую информацию о сервере без авторизации (онлайн, версия, MOTD, список первых игроков):

```javascript
const result = await status(host, port, { timeout: 5000 });
return {
    online: true,
    players: result.players.online,
    maxPlayers: result.players.max,
    version: result.version.name,
    sample: (result.players.sample || []).map(p => p.name),
};
```

### 9.2 RCON

Remote Console — двоичный TCP-протокол для выполнения команд. Требует включения и указания пароля в `server.properties`. Используется для получения списка игроков, плагинов, TPS, выполнения административных команд и кика игроков.

### 9.3 Docker CLI

Управление контейнерами через дочерний процесс:

```javascript
function runDocker(args) {
    return new Promise((resolve, reject) => {
        exec(`docker ${args}`, { timeout: 15000 }, (err, stdout, stderr) => {
            if (err) return reject(new Error(stderr.trim() || err.message));
            resolve(stdout.trim());
        });
    });
}

async function stop(serverId) {
    const name = CONTAINERS[serverId]();
    // Сначала graceful через RCON, затем docker stop
    if (rcon.isConnected(serverId)) {
        await rcon.send(serverId, 'stop');
        await new Promise(r => setTimeout(r, 3000));
    }
    return runDocker(`stop ${name}`);
}
```

## 10. Безопасность

### 10.1 Хранение паролей

bcrypt с раундом 10 — стандарт de-facto для защиты от brute-force даже в случае утечки БД.

### 10.2 JWT-токены

- Подписаны секретом из `.env` (минимум 32 случайных байта)
- Срок действия — 12 часов
- Хранятся в httpOnly cookie (защита от XSS)
- SameSite=Lax (защита от CSRF)
- Возможность принудительного отзыва через флаг `revoked` в таблице sessions

### 10.3 Защита от SQL-инъекций

Все запросы используют параметризованные prepared statements:
```javascript
db.prepare('SELECT * FROM users WHERE username=?').get(username);
```

### 10.4 Защита эндпоинтов

Все маршруты под `/api/*` (кроме `/auth/login`) требуют валидную сессию через `requireAuth`. Мутирующие операции дополнительно требуют роль через `requireRole`.

### 10.5 Аудит

Каждое действие администратора записывается в `audit_log` с временем, IP-адресом и деталями. Только super-admin имеет доступ к журналу.

## 11. Развёртывание

Подробная инструкция — в `DEPLOY.md`. Краткая последовательность:

```bash
# 1. Установка зависимостей
cd backend && npm install
cd ../frontend && npm install

# 2. Конфигурация
cp backend/.env.example backend/.env
nano backend/.env       # заполнить JWT_SECRET, пароли RCON, имена контейнеров

# 3. Сборка frontend
cd frontend && npm run build

# 4. Запуск через PM2 для автоперезапуска и автозагрузки
cd ../backend
pm2 start src/index.js --name mc-panel
pm2 save && pm2 startup
```

После запуска панель доступна по адресу `http://<IP>:3001`. Учётная запись по умолчанию: `admin / admin` (требуется сменить пароль при первом входе).

## 12. Возможности расширения

Архитектура спроектирована с учётом масштабирования:

- **Поддержка нескольких физических серверов** — переход к агентной модели: на каждом узле запускается тот же backend в режиме агента, центральная панель агрегирует их состояние через HTTPS API.
- **Миграция СУБД** — переход с SQLite на PostgreSQL возможен заменой инициализатора в `db/database.js`, поскольку запросы используют стандартный SQL.
- **Распределённые сессии** — для нескольких экземпляров панели за балансировщиком потребуется внешний Redis для хранения WebSocket-сессий.
- **Метрики Prometheus** — добавление экспортёра в формате OpenMetrics для интеграции с существующими системами мониторинга.

## 13. Структура коммитов и контроль версий

Проект ведётся в Git-репозитории. Каждый коммит имеет краткое описание сути изменения. История разделена на логические этапы:

1. Инициализация backend и базовая схема БД
2. Реализация авторизации и ролевой модели
3. Интеграция RCON и Server List Ping
4. Реализация WebSocket для realtime
5. Frontend: дашборд, графики, основные страницы
6. Управление контейнерами через Docker CLI
7. Система аудита
8. Адаптивная вёрстка
9. Расширенная статистика серверов

Это позволяет легко проследить эволюцию проекта и обоснованность каждого архитектурного решения.
