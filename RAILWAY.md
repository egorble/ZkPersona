# Деплой Backend на Railway

> **Якщо збірка впала з:**  
> `Railpack could not determine how to build the app` або в логах видно `./` з папками `backend/`, `frontend/` — **не встановлено Root Directory**.  
> Нижче крок 2 обовʼязково зробити **до** першого деплою (або одразу після створення сервісу).

## 1. Створити проект

1. Зайти на [railway.app](https://railway.app) → **Login** (GitHub).
2. **New Project** → **Deploy from GitHub repo**.
3. Обрати репозиторій **egorble/ZkPersona** (або свій fork).

## 2. Root Directory — обовʼязково (інакше build впаде)

1. В проекті натиснути на створений **Service** (прямокутник з назвою сервісу).
2. Відкрити **Settings** (іконка шестерні або вкладка).
3. Знайти секцію **Source** (або **Build**).
4. Поле **Root Directory** — ввести **саме** `backend` (без слешу).
5. Натиснути **Save** / **Update**.

Після збереження зробіть **Redeploy** (Deployments → три крапки біля останнього деплою → Redeploy, або новий commit у репо).

Без цього Railway збирає з кореня репо, не бачить `package.json` (він у `backend/`) і показує: *"Railpack could not determine how to build the app"*.

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

---

## Помилка: "Railpack could not determine how to build the app"

**Причина:** збірка йде з кореня репо (там немає `package.json`).

**Що зробити:** у сервісі Railway → **Settings** → **Source** → **Root Directory** = `backend` → **Save** → **Redeploy**.
