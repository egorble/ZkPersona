# Виправлення помилки 400 від Discord OAuth

## Проблема

Discord OAuth повертає помилку 400:
```
authorize:1 Failed to load resource: the server responded with a status of 400 ()
```

## Причина

Redirect URI не зареєстрований або не відповідає точно в Discord Developer Portal.

## Рішення

### Крок 1: Перевірити точний redirect URI в логах backend

1. **Перевірте логи backend** - має бути виведено:
   ```
   [Discord] ⚠️  Redirect URI: https://seborrheal-punchiest-janette.ngrok-free.dev/auth/discord/callback
   ```

2. **Скопіюйте точний URL** з логів backend

### Крок 2: Зареєструвати redirect URI в Discord Developer Portal

1. **Перейти до:** https://discord.com/developers/applications

2. **Вибрати вашу програму** (Client ID: 1462782452702511271)

3. **Перейти до:** OAuth2 → General

4. **У розділі "Redirects":**
   - Перевірити, чи є: `https://seborrheal-punchiest-janette.ngrok-free.dev/auth/discord/callback`
   - Якщо немає - додати точно цей URL
   - **ВАЖЛИВО:** URL має бути точно таким же, включаючи:
     - `https://` (не `http://`)
     - Точний домен (без зайвих слешів)
     - Точний шлях `/auth/discord/callback`

5. **Зберегти зміни** (кнопка "Save Changes" внизу)

### Крок 3: Перевірити ngrok warning page

Ngrok безкоштовний план показує warning page. Можливо потрібно:

1. **Перевірити, чи ngrok працює:**
   ```powershell
   # Відкрити ngrok web interface
   # http://127.0.0.1:4040
   ```

2. **Якщо є warning page**, можна:
   - Натиснути "Visit Site" на warning page
   - Або використати ngrok authtoken для прибрати warning

### Крок 4: Перевірити Client ID та Client Secret

1. **Перевірити `backend/.env`:**
   ```env
   DISCORD_CLIENT_ID=1462782452702511271
   DISCORD_CLIENT_SECRET=SpG41UWGAEa1rT6ECkckNeERQRhoaXql
   ```

2. **Перевірити в Discord Developer Portal:**
   - Client ID має відповідати
   - Client Secret має відповідати (якщо був reset, потрібно оновити)

### Крок 5: Перезапустити backend

Після оновлення redirect URI:

```powershell
# Зупинити backend (Ctrl+C)
cd backend
npm start
```

## Додаткові перевірки

### Перевірити логи backend

Після спроби підключення Discord, перевірте логи backend:

```
[Discord] OAuth URL generated: ...
[Discord] ⚠️  Redirect URI: ...
```

### Перевірити ngrok URL

Якщо ngrok URL змінився:

1. Скопіювати новий URL з ngrok терміналу
2. Оновити `backend/.env`: `BACKEND_URL=https://новий-url.ngrok-free.dev`
3. Оновити Discord Developer Portal redirect URI
4. Перезапустити backend

## Альтернативне рішення: Використання Railway/Render

Для production (без ngrok обмежень):

1. Задеплоїти backend на Railway або Render (див. `QUICK_DEPLOY.md`)
2. Використати production URL для `BACKEND_URL`
3. Зареєструвати production redirect URI в Discord Developer Portal

## Типові помилки

- ❌ `http://seborrheal-punchiest-janette.ngrok-free.dev/auth/discord/callback` (http замість https)
- ❌ `https://seborrheal-punchiest-janette.ngrok-free.dev/auth/discord/callback/` (зайвий слеш в кінці)
- ❌ `https://seborrheal-punchiest-janette.ngrok-free.dev/auth/discord` (неповний шлях)
- ✅ `https://seborrheal-punchiest-janette.ngrok-free.dev/auth/discord/callback` (правильно)
