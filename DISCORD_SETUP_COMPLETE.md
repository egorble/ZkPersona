# Discord OAuth налаштування - завершено ✅

## Поточний стан

- ✅ **Ngrok запущений:** `https://seborrheal-punchiest-janette.ngrok-free.dev`
- ✅ **Backend URL оновлено** в `backend/.env`
- ✅ **Backend перезапущено** з новим URL

## Наступний крок: Оновити Discord Developer Portal

1. **Перейти до Discord Developer Portal:**
   https://discord.com/developers/applications

2. **Вибрати вашу програму** (Client ID: 1462782452702511271)

3. **Перейти до OAuth2 → General**

4. **У розділі "Redirects" перевірити/додати:**
   ```
   https://seborrheal-punchiest-janette.ngrok-free.dev/auth/discord/callback
   ```

5. **Зберегти зміни**

## Перевірка

Після оновлення Discord Developer Portal:

1. **Спробуйте підключити Discord** через frontend
2. **Перевірте логи backend** - мають бути детальні логи про OAuth процес
3. **Якщо помилка 400** - перевірте, що redirect URI точно відповідає в Discord Portal

## Важливі примітки

- **Ngrok URL змінюється** при кожному перезапуску ngrok
- **Оновлюйте redirect URI** в Discord Developer Portal при зміні ngrok URL
- **Backend має працювати** на `localhost:3001` (ngrok просто проксує запити)
- **Ngrok має працювати** окремо - не закривайте термінал

## Структура процесів

```
✅ Terminal 1: Backend (localhost:3001)
✅ Terminal 2: Frontend (localhost:5173)  
✅ Terminal 3: Ngrok (проксує на localhost:3001)
```

## Якщо ngrok URL змінився

1. Скопіювати новий URL з ngrok терміналу
2. Оновити `backend/.env`: `BACKEND_URL=https://новий-url.ngrok-free.dev`
3. Оновити Discord Developer Portal redirect URI
4. Перезапустити backend
