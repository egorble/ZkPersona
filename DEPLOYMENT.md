# Deployment Guide - Production Backend

## Варіанти deployment

### 1. Railway (Рекомендовано - найпростіше)

Railway автоматично запускає backend і надає постійний URL.

#### Крок 1: Створити проект на Railway

1. Зареєструватися на [railway.app](https://railway.app)
2. Створити новий проект
3. Додати PostgreSQL database (опціонально)
4. Connect GitHub repository або завантажити код

#### Крок 2: Налаштувати Environment Variables

В Railway dashboard → Variables додати:

```env
# Backend URL (Railway надасть автоматично, або встановити вручну)
BACKEND_URL=https://your-app.railway.app
FRONTEND_URL=https://your-frontend-domain.com

# OAuth Credentials
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
TIKTOK_CLIENT_ID=your_tiktok_client_id
TIKTOK_CLIENT_SECRET=your_tiktok_client_secret
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_BOT_USERNAME=zkpersona_bot

# Database (якщо використовується PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Secret Salt для commitments
SECRET_SALT=your-secret-salt-production

# Port (Railway надає автоматично)
PORT=3001
```

#### Крок 3: Налаштувати Build Command

Railway автоматично визначить Node.js проект, але можна вказати явно:

**railway.json** (в корені backend/):
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

#### Крок 4: Оновити OAuth Redirect URIs

В OAuth додатках провайдерів додати production redirect URIs:

**Discord:**
```
https://your-app.railway.app/auth/discord/callback
```

**TikTok:**
```
https://your-app.railway.app/auth/tiktok/callback
```

---

### 2. Render (Альтернатива)

#### Крок 1: Створити Web Service

1. Зареєструватися на [render.com](https://render.com)
2. New → Web Service
3. Connect GitHub repository
4. Налаштувати:
   - **Build Command:** `cd backend && npm install`
   - **Start Command:** `cd backend && npm start`
   - **Environment:** Node

#### Крок 2: Environment Variables

В Render dashboard → Environment додати ті самі змінні, що для Railway.

#### Крок 3: Оновити Redirect URIs

```
https://your-app.onrender.com/auth/discord/callback
https://your-app.onrender.com/auth/tiktok/callback
```

---

### 3. VPS (Vultr, DigitalOcean, AWS EC2)

#### Крок 1: Підключитися до сервера

```bash
ssh user@your-server-ip
```

#### Крок 2: Встановити Node.js та PM2

```bash
# Встановити Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Встановити PM2 для постійної роботи
sudo npm install -g pm2
```

#### Крок 3: Клонувати проект

```bash
git clone https://github.com/your-username/zkpersona.git
cd zkpersona/backend
npm install
```

#### Крок 4: Налаштувати .env

```bash
nano .env
```

Додати всі необхідні змінні (див. Railway секцію).

#### Крок 5: Запустити з PM2

```bash
# Запустити backend
pm2 start src/server.js --name zkpersona-backend

# Зберегти конфігурацію для автозапуску
pm2 save
pm2 startup
```

#### Крок 6: Налаштувати Nginx (опціонально)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Крок 7: Налаштувати SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Оновлення Frontend для Production

### Крок 1: Створити .env файл в frontend

**frontend/.env.production:**
```env
VITE_BACKEND_URL=https://your-backend-domain.com
```

### Крок 2: Оновити frontend для автоматичного визначення

**frontend/src/utils/backendAPI.ts** вже має fallback:
```typescript
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
```

Для production просто встановити `VITE_BACKEND_URL` в `.env.production`.

### Крок 3: Build frontend для production

```bash
cd frontend
npm run build
```

### Крок 4: Deploy frontend

**Варіанти:**
- Vercel (рекомендовано для React)
- Netlify
- GitHub Pages
- VPS з Nginx

---

## Налаштування OAuth Redirect URIs для Production

### Discord Developer Portal

1. Відкрити [Discord Developer Portal](https://discord.com/developers/applications)
2. Вибрати ваш OAuth додаток
3. OAuth2 → Redirects
4. Додати:
   ```
   https://your-backend-domain.com/auth/discord/callback
   ```

### TikTok Developer Portal

1. Відкрити [TikTok Developer Portal](https://developers.tiktok.com/)
2. Вибрати ваш OAuth додаток
3. Redirect URI
4. Додати:
   ```
   https://your-backend-domain.com/auth/tiktok/callback
   ```

---

## Перевірка Production Deployment

### 1. Health Check

```bash
curl https://your-backend-domain.com/health
```

**Очікуваний результат:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-27T..."
}
```

### 2. Configuration Status

```bash
curl https://your-backend-domain.com/config/status
```

**Очікуваний результат:**
```json
{
  "status": "ok",
  "providers": {
    "discord": { "configured": true, "missing": [] },
    "telegram": { "configured": true, "missing": [] },
    "tiktok": { "configured": true, "missing": [] }
  }
}
```

### 3. Тест OAuth Flow

1. Відкрити production frontend
2. Підключити Aleo wallet
3. Натиснути "Start Verification" для Discord
4. Перевірити, що popup відкривається і OAuth flow працює

---

## Environment Variables Checklist

### Backend (.env)

```env
# URLs
BACKEND_URL=https://your-backend-domain.com
FRONTEND_URL=https://your-frontend-domain.com

# OAuth - Discord
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret

# OAuth - TikTok
TIKTOK_CLIENT_ID=your_client_id
TIKTOK_CLIENT_SECRET=your_client_secret

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_BOT_USERNAME=zkpersona_bot

# Database (опціонально)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Security
SECRET_SALT=your-production-secret-salt

# Server
PORT=3001
NODE_ENV=production
```

### Frontend (.env.production)

```env
VITE_BACKEND_URL=https://your-backend-domain.com
```

---

## Автоматичне оновлення (CI/CD)

### GitHub Actions для Railway/Render

Railway та Render автоматично деплоять при push в main branch.

### GitHub Actions для VPS

**.github/workflows/deploy.yml:**
```yaml
name: Deploy Backend

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to VPS
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd zkpersona/backend
            git pull
            npm install
            pm2 restart zkpersona-backend
```

---

## Monitoring та Logs

### PM2 Monitoring

```bash
# Переглянути логи
pm2 logs zkpersona-backend

# Переглянути статус
pm2 status

# Перезапустити
pm2 restart zkpersona-backend
```

### Railway/Render Logs

Логи доступні в dashboard → Logs.

---

## Безпека Production

### 1. HTTPS Only

Переконатися, що backend доступний тільки через HTTPS.

### 2. Environment Variables

Ніколи не комітити `.env` файли в Git. Використовувати secrets в deployment платформах.

### 3. CORS

Переконатися, що `FRONTEND_URL` правильно налаштований для production.

### 4. Rate Limiting

Рекомендується додати rate limiting для API endpoints.

---

## Troubleshooting

### Backend не запускається

1. Перевірити логи: `pm2 logs` або в deployment dashboard
2. Перевірити environment variables
3. Перевірити, що порт доступний

### OAuth не працює

1. Перевірити redirect URIs в OAuth додатках
2. Перевірити, що credentials правильні
3. Перевірити логи backend при OAuth callback

### Frontend не підключається до backend

1. Перевірити `VITE_BACKEND_URL` в frontend `.env.production`
2. Перевірити CORS налаштування в backend
3. Перевірити, що backend доступний з frontend domain

---

## Рекомендації

### Для швидкого старту:
- **Railway** - найпростіше, автоматичний deployment
- **Render** - схоже на Railway, безкоштовний tier

### Для повного контролю:
- **VPS** - повний контроль, потрібна налаштування
- **AWS/GCP** - для enterprise рішень

### Для frontend:
- **Vercel** - найкраще для React/Vite
- **Netlify** - альтернатива Vercel

---

## Quick Start (Railway)

1. Зареєструватися на railway.app
2. New Project → Deploy from GitHub repo
3. Додати environment variables
4. Оновити OAuth redirect URIs
5. Оновити frontend `VITE_BACKEND_URL`
6. Done! ✅

Backend буде працювати завжди на `https://your-app.railway.app`
