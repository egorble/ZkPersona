# Локальна розробка без Ngrok

## Проблема
Ngrok тунель офлайн, а Discord OAuth потребує публічний URL для callback.

## Рішення 1: Використання localhost (для тестування без Discord)

1. **Оновити `backend/.env`:**
   ```env
   BACKEND_URL=http://localhost:3001
   FRONTEND_URL=http://localhost:5173
   ```

2. **Запустити backend:**
   ```powershell
   cd backend
   npm start
   ```

3. **Запустити frontend:**
   ```powershell
   cd frontend
   npm run dev
   ```

**Примітка:** Discord OAuth **НЕ ПРАЦЮЄ** з `localhost` - Discord вимагає HTTPS домен. Для Discord потрібен ngrok або production deployment.

## Рішення 2: Запустити Ngrok для Discord OAuth

1. **Встановити ngrok** (якщо ще не встановлено):
   - Завантажити з https://ngrok.com/download
   - Або через chocolatey: `choco install ngrok`

2. **Запустити ngrok тунель:**
   ```powershell
   ngrok http 3001
   ```

3. **Скопіювати ngrok URL** (наприклад: `https://abc123.ngrok-free.app`)

4. **Оновити `backend/.env`:**
   ```env
   BACKEND_URL=https://abc123.ngrok-free.app
   FRONTEND_URL=http://localhost:5173
   ```

5. **Оновити Discord Developer Portal:**
   - Перейти до https://discord.com/developers/applications
   - Вибрати вашу програму
   - OAuth2 > General > Redirects
   - Додати: `https://abc123.ngrok-free.app/auth/discord/callback`
   - Зберегти

6. **Перезапустити backend:**
   ```powershell
   cd backend
   npm start
   ```

## Рішення 3: Використання Railway/Render (Production)

Для постійної роботи без ngrok, використовуйте Railway або Render (див. `QUICK_DEPLOY.md`).

## Поточний стан

- ✅ Backend може працювати на `localhost:3001`
- ✅ Frontend може працювати на `localhost:5173`
- ❌ Discord OAuth потребує публічний HTTPS URL (ngrok або production)
- ✅ Інші провайдери (EVM, Solana) працюють з localhost

## Швидкий старт для локальної розробки

```powershell
# Terminal 1: Backend
cd backend
npm start

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Ngrok (тільки для Discord OAuth)
ngrok http 3001
```

Після запуску ngrok, оновіть `BACKEND_URL` в `backend/.env` та redirect URI в Discord Developer Portal.
