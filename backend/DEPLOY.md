# Backend Deployment Guide

## Швидкий старт (Railway - найпростіше)

### 1. Створити проект на Railway

1. Зареєструватися на [railway.app](https://railway.app)
2. New Project → Deploy from GitHub repo
3. Вказати папку: `backend`

### 2. Додати Environment Variables

В Railway dashboard → Variables:

```env
BACKEND_URL=https://your-app.railway.app
FRONTEND_URL=https://your-frontend-domain.com

DISCORD_CLIENT_ID=1462782452702511271
DISCORD_CLIENT_SECRET=SpG41UWGAEa1rT6ECkckNeERQRhoaXql

TIKTOK_CLIENT_ID=awuelncpgc77ti0b
TIKTOK_CLIENT_SECRET=xulR7o8NKFF0LyN75eH7PPVc68mfK5j4

TELEGRAM_BOT_TOKEN=8253687777:AAFh7JxVTHFbn-ui8yOW4oW3h7agJHtYKZo
TELEGRAM_BOT_USERNAME=zkpersona_bot

SECRET_SALT=your-production-secret-salt
NODE_ENV=production
```

### 3. Оновити OAuth Redirect URIs

**Discord Developer Portal:**
- Додати: `https://your-app.railway.app/auth/discord/callback`

**TikTok Developer Portal:**
- Додати: `https://your-app.railway.app/auth/tiktok/callback`

### 4. Оновити Frontend

**frontend/.env.production:**
```env
VITE_BACKEND_URL=https://your-app.railway.app
```

Готово! Backend працює завжди на Railway.

---

## Альтернатива: Render.com

1. New Web Service → Connect GitHub
2. Налаштувати:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
3. Додати Environment Variables (як для Railway)
4. Оновити OAuth redirect URIs

---

## VPS з PM2 (для повного контролю)

### 1. Встановити PM2

```bash
npm install -g pm2
```

### 2. Запустити backend

```bash
cd backend
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Автозапуск при перезавантаженні сервера
```

### 3. Переглянути статус

```bash
pm2 status
pm2 logs zkpersona-backend
```

---

## Перевірка

```bash
# Health check
curl https://your-backend-domain.com/health

# Config status
curl https://your-backend-domain.com/config/status
```

---

## Важливо

1. **Ніколи не комітити `.env`** в Git
2. **Використовувати HTTPS** в production
3. **Оновити OAuth redirect URIs** в провайдерів
4. **Оновити `VITE_BACKEND_URL`** в frontend
