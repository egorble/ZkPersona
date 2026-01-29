# Запуск Ngrok для Discord OAuth

## Швидкий старт

1. **Відкрити новий термінал** (важливо - ngrok має працювати окремо)

2. **Запустити ngrok:**
   ```powershell
   # Варіант 1: Через npx (рекомендовано)
   npx ngrok http 3001
   
   # Варіант 2: Через скрипт
   .\start-ngrok.ps1
   
   # Варіант 3: Якщо ngrok в PATH
   ngrok http 3001
   ```

3. **Скопіювати HTTPS URL** з виводу ngrok (наприклад: `https://abc123.ngrok-free.app`)

4. **Оновити `backend/.env`:**
   ```env
   BACKEND_URL=https://ваш-ngrok-url.ngrok-free.app
   ```

5. **Оновити Discord Developer Portal:**
   - Перейти до https://discord.com/developers/applications
   - Вибрати вашу програму
   - OAuth2 → General → Redirects
   - Додати: `https://ваш-ngrok-url.ngrok-free.app/auth/discord/callback`
   - Зберегти зміни

6. **Перезапустити backend** (якщо він вже запущений):
   ```powershell
   # Зупинити поточний backend (Ctrl+C)
   cd backend
   npm start
   ```

## Важливі примітки

- **Ngrok має працювати окремо** - не закривайте термінал з ngrok
- **URL змінюється** при кожному перезапуску ngrok (на безкоштовному плані)
- **Оновлюйте redirect URI** в Discord Developer Portal при зміні ngrok URL
- **Backend має працювати** на `localhost:3001` перед запуском ngrok

## Альтернатива: Використання localhost (без Discord)

Якщо не потрібен Discord OAuth, можна використовувати `localhost:3001`:

```env
# backend/.env
BACKEND_URL=http://localhost:3001
```

EVM/Solana wallet підключення працює з localhost.

## Структура терміналів

```
Terminal 1: Backend
  cd backend
  npm start

Terminal 2: Frontend  
  cd frontend
  npm run dev

Terminal 3: Ngrok (для Discord OAuth)
  npx ngrok http 3001
```
