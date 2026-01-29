# Налаштування підключення соціальних мереж

## Поточний стан налаштування

### ✅ Налаштовані провайдери

#### 1. **Discord**
- **Credentials:** ✅ Налаштовано (`DISCORD_CLIENT_ID` в `.env`)
- **Backend routes:** ✅ `/auth/discord/start`, `/auth/discord/callback`, `/auth/discord/status`
- **Provider logic:** ✅ `backend/src/providers/discord.js`
- **Scoring:** ✅ `backend/src/scoring/discord.js`
- **Popup flow:** ✅ Налаштовано (postMessage)
- **Вимоги для верифікації:**
  - Акаунт старше 365 днів
  - Членство в мінімум 10 серверах
  - Мінімум 2 верифіковані зовнішні підключення

#### 2. **Telegram**
- **Credentials:** ✅ Налаштовано (`TELEGRAM_BOT_TOKEN` в `.env`)
- **Backend routes:** ✅ `/auth/telegram/start`, `/auth/telegram/callback`, `/auth/telegram/status`
- **Provider logic:** ✅ `backend/src/providers/telegram.js`
- **Scoring:** ✅ `backend/src/scoring/telegram.js`
- **Popup flow:** ✅ Налаштовано (через Telegram Bot deep linking)
- **Особливості:** Використовує Telegram Bot API замість OAuth

#### 3. **TikTok**
- **Credentials:** ✅ Налаштовано (`TIKTOK_CLIENT_ID` в `.env`)
- **Backend routes:** ✅ `/auth/tiktok/start`, `/auth/tiktok/callback`, `/auth/tiktok/status`
- **Provider logic:** ✅ `backend/src/providers/tiktok.js`
- **Scoring:** ✅ `backend/src/scoring/tiktok.js`
- **Popup flow:** ✅ Налаштовано (postMessage)

### ⚠️ Потрібно перевірити

#### 1. **Backend Server**
- **Статус:** ❓ Потрібно запустити
- **URL:** `http://localhost:3001`
- **Health check:** `/health` endpoint доступний
- **Проблема:** Якщо backend не запущений → `ERR_CONNECTION_REFUSED`

#### 2. **OAuth Credentials**
- **Discord:** ✅ `DISCORD_CLIENT_ID` налаштовано
- **Discord:** ❓ Перевірити `DISCORD_CLIENT_SECRET` в `.env`
- **Telegram:** ✅ `TELEGRAM_BOT_TOKEN` налаштовано
- **TikTok:** ✅ `TIKTOK_CLIENT_ID` налаштовано
- **TikTok:** ❓ Перевірити `TIKTOK_CLIENT_SECRET` в `.env`

#### 3. **OAuth Redirect URIs**
Потрібно налаштувати в OAuth додатках провайдерів:

**Discord (Discord Developer Portal):**
```
http://localhost:3001/auth/discord/callback
```

**TikTok (TikTok Developer Portal):**
```
http://localhost:3001/auth/tiktok/callback
```

**Telegram:**
- Використовує Bot deep linking, не потребує redirect URI
- **Обов'язково:** потрібен **webhook** — Telegram надсилає події бота (наприклад /start) тільки на публічний HTTPS URL. Якщо бекенд на localhost, бот не отримає /start і не відповість.
- **Локальна розробка:** запустіть ngrok: `ngrok http 3001`, встановіть у `.env`: `BACKEND_URL=https://ваш-id.ngrok.io`, потім один раз відкрийте в браузері: `https://ваш-id.ngrok.io/auth/telegram/set-webhook` — це зареєструє webhook у Telegram.
- **Production:** після деплою бекенду відкрийте `https://ваш-бекенд/auth/telegram/set-webhook` один раз.

---

## Як перевірити налаштування

### 1. Перевірити backend сервер

```bash
# Запустити backend
cd backend
npm start

# Перевірити health check
curl http://localhost:3001/health
```

**Очікуваний результат:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-27T..."
}
```

### 2. Перевірити конфігурацію провайдерів

```bash
# Перевірити статус конфігурації
curl http://localhost:3001/config/status
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

### 3. Перевірити OAuth flow

1. **Відкрити frontend:** `http://localhost:5173`
2. **Підключити Aleo wallet**
3. **Натиснути "Start Verification" для Discord/Telegram/TikTok**
4. **Перевірити:**
   - ✅ Popup відкривається (якщо backend доступний)
   - ✅ OAuth сторінка провайдера завантажується
   - ✅ Після авторизації popup закривається
   - ✅ Результат з'являється на головній сторінці

---

## Проблеми та рішення

### Проблема 1: ERR_CONNECTION_REFUSED

**Симптоми:**
- Popup показує помилку "Не удается получить доступ к сайту"
- URL: `http://localhost:3001/auth/discord/start?...`

**Рішення:**
1. Запустити backend сервер:
   ```bash
   cd backend
   npm start
   ```

2. Перевірити, що backend працює:
   ```bash
   curl http://localhost:3001/health
   ```

3. Перевірити, що frontend перевіряє доступність backend перед відкриттям popup (вже реалізовано в `backendAPI.ts`)

### Проблема 2: OAuth credentials не налаштовані

**Симптоми:**
- Backend повертає помилку: `DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET not configured`
- `/config/status` показує `configured: false`

**Рішення:**
1. Додати credentials в `backend/.env`:
   ```env
   DISCORD_CLIENT_ID=your_client_id
   DISCORD_CLIENT_SECRET=your_client_secret
   TIKTOK_CLIENT_ID=your_client_id
   TIKTOK_CLIENT_SECRET=your_client_secret
   TELEGRAM_BOT_TOKEN=your_bot_token
   ```

2. Перезапустити backend сервер

### Проблема 3: OAuth redirect URI не співпадає

**Симптоми:**
- OAuth провайдер повертає помилку: "redirect_uri_mismatch"
- Backend отримує callback, але з помилкою

**Рішення:**
1. Перевірити redirect URI в OAuth додатку провайдера
2. Переконатися, що redirect URI точно співпадає з тим, що в `.env`:
   - Discord: `http://localhost:3001/auth/discord/callback`
   - TikTok: `http://localhost:3001/auth/tiktok/callback`

### Проблема 4: Popup закривається без результату

**Симптоми:**
- Popup відкривається, але закривається без postMessage
- В консолі: `[OAuth] Popup was closed`

**Можливі причини:**
1. Backend не повертає postMessage HTML
2. OAuth callback не виконується
3. Помилка в обробці callback на backend

**Рішення:**
1. Перевірити логи backend при OAuth callback
2. Перевірити, що backend повертає HTML з postMessage скриптом
3. Перевірити, що `FRONTEND_URL` правильно налаштований в `.env`

---

## Поточний flow (Gitcoin Passport Model)

### OAuth провайдери (Discord, TikTok)

```
1. User натискає "Start Verification"
   └─> Frontend перевіряє доступність backend (checkBackendAvailability)
       └─> Якщо backend недоступний → показує помилку
       └─> Якщо backend доступний → відкриває popup
           └─> Popup: GET /auth/{provider}/start?passportId=...
               └─> Backend створює session
                   └─> Redirect на OAuth провайдера
                       └─> User авторизує
                           └─> Redirect на /auth/{provider}/callback?code=...&state=...
                               └─> Backend обробляє callback
                                   └─> Розраховує score
                                       └─> Генерує commitment
                                           └─> Повертає HTML з postMessage
                                               └─> Popup закривається
                                                   └─> Frontend отримує результат
                                                       └─> Показує score та "Claim Points" button
```

### Telegram (спеціальний кейс)

```
1. User натискає "Start Verification"
   └─> Frontend відкриває popup
       └─> Popup: GET /auth/telegram/start?passportId=...
           └─> Backend створює session
               └─> Redirect на Telegram Bot deep link
                   └─> User відкриває Telegram Bot
                       └─> User натискає /start в боті
                           └─> Bot відправляє webhook на backend
                               └─> Backend обробляє webhook
                                   └─> Розраховує score
                                       └─> Зберігає результат в session
                                           └─> Frontend polling або postMessage
```

---

## Чеклист для запуску

### Backend
- [ ] Backend сервер запущений на `http://localhost:3001`
- [ ] Health check доступний: `GET /health`
- [ ] OAuth credentials налаштовані в `.env`
- [ ] Redirect URIs налаштовані в OAuth додатках провайдерів
- [ ] Database підключена (або in-memory fallback)

### Frontend
- [ ] Frontend запущений на `http://localhost:5173`
- [ ] `VITE_BACKEND_URL` налаштований в `.env` (або використовується default)
- [ ] Aleo wallet підключений
- [ ] Popup flow працює (перевірка доступності backend перед відкриттям)

### OAuth додатки
- [ ] Discord OAuth додаток створений в Discord Developer Portal
- [ ] Redirect URI додано: `http://localhost:3001/auth/discord/callback`
- [ ] TikTok OAuth додаток створений в TikTok Developer Portal
- [ ] Redirect URI додано: `http://localhost:3001/auth/tiktok/callback`
- [ ] Telegram Bot створений через @BotFather
- [ ] Bot Token додано в `.env`

---

## Тестування

### Тест 1: Перевірка доступності backend

```bash
# З frontend (в браузері)
fetch('http://localhost:3001/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

**Очікуваний результат:** `{ status: 'ok', timestamp: '...' }`

### Тест 2: Перевірка конфігурації

```bash
curl http://localhost:3001/config/status
```

**Очікуваний результат:** Всі провайдери `configured: true`

### Тест 3: Тест OAuth flow (Discord)

1. Відкрити `http://localhost:5173`
2. Підключити Aleo wallet
3. Натиснути "Start Verification" для Discord
4. Перевірити:
   - ✅ Popup відкривається
   - ✅ Discord OAuth сторінка завантажується
   - ✅ Після авторизації popup закривається
   - ✅ Результат з'являється на сторінці

---

## Висновок

**Поточний стан:**
- ✅ Backend routes налаштовані
- ✅ Provider logic реалізована
- ✅ Popup flow налаштований
- ✅ PostMessage логіка працює
- ✅ OAuth credentials частково налаштовані
- ⚠️ Потрібно перевірити `DISCORD_CLIENT_SECRET` та `TIKTOK_CLIENT_SECRET`
- ⚠️ Потрібно запустити backend сервер для тестування

**Наступні кроки:**
1. Запустити backend сервер
2. Перевірити всі OAuth credentials в `.env`
3. Налаштувати redirect URIs в OAuth додатках провайдерів
4. Протестувати OAuth flow для кожного провайдера
