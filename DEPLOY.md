# Инструкция по запуску на дедике (Ubuntu)

## Требования

- Ubuntu 20.04+ (или 22.04)
- Node.js 20+
- Minecraft серверы с включённым RCON (Lobby, Game)
- PM2 для автозапуска

---

## 1. Установка Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # должно быть v20+
```

---

## 2. Клонирование / загрузка проекта

Скопируйте папку `BigPanelv2` на дедик любым способом (scp, git, sftp).

```bash
# Пример через scp с Windows:
scp -r C:\Users\Administrator\code\BigPanelv2 user@<IP>:/opt/mc-panel
```

---

## 3. Настройка RCON на серверах Minecraft

В `server.properties` каждого сервера (Lobby, Game):

```properties
enable-rcon=true
rcon.port=25576        # Lobby: 25576, Game: 25577
rcon.password=СЛОЖНЫЙ_ПАРОЛЬ
```

Перезапустите серверы после изменения.

> **Velocity** — прокси, RCON не нужен. Достаточно стандартного порта 25565.

---

## 4. Настройка переменных окружения

```bash
cd /opt/mc-panel/backend
cp .env.example .env
nano .env
```

Заполните `.env`:

```env
PORT=3001
JWT_SECRET=сгенерируйте_длинную_случайную_строку_минимум_32_символа

FRONTEND_URL=http://<IP_ДЕДИКА>:3000

VELOCITY_HOST=127.0.0.1
VELOCITY_PORT=25565

LOBBY_HOST=127.0.0.1
LOBBY_PORT=25566
LOBBY_RCON_PORT=25576
LOBBY_RCON_PASS=ваш_пароль_rcon

GAME_HOST=127.0.0.1
GAME_PORT=25567
GAME_RCON_PORT=25577
GAME_RCON_PASS=ваш_пароль_rcon

LOBBY_SERVER_PATH=/путь/к/папке/lobby
GAME_SERVER_PATH=/путь/к/папке/game
```

Сгенерировать JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 5. Установка зависимостей

```bash
cd /opt/mc-panel/backend
npm install

cd /opt/mc-panel/frontend
npm install
```

---

## 6. Сборка фронтенда

```bash
cd /opt/mc-panel/frontend
npm run build
# → создаст папку dist/
```

---

## 7. Установка PM2 и запуск

```bash
sudo npm install -g pm2

cd /opt/mc-panel/backend
pm2 start src/index.js --name "mc-panel"

# Автозапуск при перезагрузке сервера:
pm2 startup
pm2 save
```

---

## 8. Проверка

```bash
pm2 logs mc-panel          # смотреть логи
pm2 status                 # статус процесса
```

Откройте в браузере: `http://<IP_ДЕДИКА>:3001`

Логин по умолчанию: **admin / admin**
> Сразу смените пароль после входа!

---

## 9. (Опционально) Nginx как прокси

Если хотите открыть панель на стандартном порту 80 без указания :3001:

```bash
sudo apt install nginx
```

`/etc/nginx/sites-available/mc-panel`:
```nginx
server {
    listen 80;
    server_name <IP или домен>;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/mc-panel /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

После этого панель доступна на `http://<IP>` (порт 80).

---

## Управление

```bash
pm2 restart mc-panel   # перезапуск
pm2 stop mc-panel      # остановка
pm2 logs mc-panel      # логи в реальном времени
```

База данных SQLite создаётся автоматически в `backend/data/panel.db`.

---

## Структура портов

| Сервис        | Порт  |
|---------------|-------|
| Панель (API + фронт) | 3001 |
| Velocity (proxy)     | 25565 |
| Lobby                | 25566 |
| Lobby RCON           | 25576 |
| Game                 | 25567 |
| Game RCON            | 25577 |
