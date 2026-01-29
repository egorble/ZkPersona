# Встановлення Ngrok для Discord OAuth

## Варіант 1: Через Chocolatey (рекомендовано)

Якщо у вас встановлений Chocolatey:

```powershell
choco install ngrok
```

Після встановлення:
```powershell
ngrok http 3001
```

## Варіант 2: Ручне встановлення

1. **Завантажити ngrok:**
   - Перейти до https://ngrok.com/download
   - Завантажити Windows версію (ZIP файл)

2. **Розпакувати:**
   - Розпакувати ZIP в папку (наприклад: `C:\ngrok\`)

3. **Додати до PATH (опціонально):**
   - Відкрити "Environment Variables" (змінні середовища)
   - Додати `C:\ngrok\` до PATH
   - Або використовувати повний шлях: `C:\ngrok\ngrok.exe http 3001`

4. **Або використовувати без PATH:**
   ```powershell
   cd C:\ngrok
   .\ngrok.exe http 3001
   ```

## Варіант 3: Через npm (якщо встановлений Node.js)

```powershell
npm install -g ngrok
```

Після встановлення:
```powershell
ngrok http 3001
```

## Варіант 4: Використання альтернатив

### Cloudflare Tunnel (безкоштовно, без обмежень)

```powershell
# Встановити cloudflared
winget install --id Cloudflare.cloudflared

# Запустити тунель
cloudflared tunnel --url http://localhost:3001
```

### LocalTunnel (npm)

```powershell
npm install -g localtunnel
lt --port 3001
```

## Після встановлення ngrok

1. **Запустити ngrok:**
   ```powershell
   ngrok http 3001
   ```

2. **Скопіювати HTTPS URL** (наприклад: `https://abc123.ngrok-free.app`)

3. **Оновити `backend/.env`:**
   ```env
   BACKEND_URL=https://abc123.ngrok-free.app
   ```

4. **Оновити Discord Developer Portal:**
   - https://discord.com/developers/applications
   - Ваша програма → OAuth2 → General → Redirects
   - Додати: `https://abc123.ngrok-free.app/auth/discord/callback`
   - Зберегти

5. **Перезапустити backend:**
   ```powershell
   cd backend
   npm start
   ```

## Важливо

- Ngrok безкоштовний план має обмеження (1 тунель, зміна URL при перезапуску)
- Для production використовуйте Railway/Render (див. `QUICK_DEPLOY.md`)
- Для локальної розробки без Discord можна використовувати `localhost:3001`
