# Деплой Backend на Railway

## 1. Створити проект

1. Зайти на [railway.app](https://railway.app) → **Login** (GitHub).
2. **New Project** → **Deploy from GitHub repo**.
3. Обрати репозиторій **egorble/ZkPersona** (або свій fork).

## 2. Root Directory (обовʼязково)

1. В проекті натиснути на створений **Service**.
2. **Settings** → секція **Source**.
3. **Root Directory:** вказати `backend`.
4. **Save**.

Без цього Railway не знайде `package.json` і збірка впаде.

## 3. Змінні середовища

**Settings** → **Variables** (або **Variables** у боковій панелі). Додати:

| Змінна | Опис | Приклад |
|--------|------|--------|
| `BACKEND_URL` | Публічний URL бекенду | `https://zkpersona-backend.railway.app` (підставити після першого деплою) |
| `FRONTEND_URL` | URL фронту на Vercel | `https://your-app.vercel.app` |
| `NODE_ENV` | Середовище | `production` |
| `SECRET_SALT` | Сіль для сесій | довільний рядок |
| `DISCORD_CLIENT_ID` | Discord OAuth | з Discord Developer Portal |
| `DISCORD_CLIENT_SECRET` | Discord OAuth | з Discord Developer Portal |
| `TELEGRAM_BOT_TOKEN` | Telegram bot | від @BotFather |
| `TELEGRAM_BOT_USERNAME` | Telegram bot | імʼя бота без @ |

Опційно (за потреби): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `TIKTOK_*`, `DATABASE_URL` (PostgreSQL) тощо.

**PORT** Railway підставляє сам, змінювати не потрібно.

## 4. Отримати URL

1. **Settings** → **Networking** → **Generate Domain** (або вже зʼявиться домен).
2. Скопіювати URL, наприклад: `https://zkpersona-backend-production-xxxx.up.railway.app`.
3. В **Variables** оновити `BACKEND_URL` на цей URL (якщо спочатку залишили заглушку).

## 5. OAuth Redirect URIs

У кожному провайдері додати callback на Railway-URL:

- **Discord:** [Discord Developer Portal](https://discord.com/developers/applications) → OAuth2 → Redirects →  
  `https://YOUR-RAILWAY-URL/auth/discord/callback`
- **TikTok:** Redirect URI → `https://YOUR-RAILWAY-URL/auth/tiktok/callback`
- Інші провайдери — аналогічно за їх документацією.

## 6. Підключити Frontend (Vercel)

У проєкті на Vercel додати змінну:

- **Name:** `VITE_BACKEND_URL`  
- **Value:** `https://YOUR-RAILWAY-URL` (той самий, що в `BACKEND_URL`).

Потім перезібрати/передеплоїти фронт на Vercel.

## Перевірка

```bash
curl https://YOUR-RAILWAY-URL/health
# {"status":"ok", ...}

curl https://YOUR-RAILWAY-URL/config/status
# Статус провайдерів (discord, telegram, ...)
```

Після push у `main` Railway автоматично перезбирає і деплоїть бекенд.
