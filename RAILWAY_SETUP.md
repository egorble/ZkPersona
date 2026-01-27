# Railway Setup - Як виправити помилку "Railpack could not determine how to build the app"

## Проблема

Railway намагається збудувати з кореня репозиторію, а не з папки `backend`, тому не може знайти `package.json`.

## Рішення 1: Вказати Root Directory в Railway (Рекомендовано)

### Крок 1: Відкрити налаштування сервісу

1. В Railway dashboard → ваш проект "ZkPersona"
2. Натиснути на ваш сервіс (backend service)
3. Перейти на вкладку **"Settings"** (або натиснути на іконку ⚙️)

### Крок 2: Встановити Root Directory

1. Знайти секцію **"Root Directory"** або **"Source"**
2. Встановити значення: `backend`
3. Зберегти зміни

### Крок 3: Перезапустити deployment

1. Перейти на вкладку **"Deployments"**
2. Натиснути **"Redeploy"** або зробити новий commit в GitHub

---

## Рішення 2: Створити railway.json в корені (Альтернатива)

Якщо Railway все одно не визначає Root Directory, створено `railway.json` в корені проекту, який вказує на `backend`.

**Файл `railway.json` вже створено в корені!**

Тепер Railway має автоматично визначити конфігурацію.

---

## Перевірка

Після налаштування, в логах Railway має з'явитися:

```
✓ Detected Node.js project
✓ Running: npm install
✓ Running: npm start
```

Замість:
```
✖ Railpack could not determine how to build the app
```

---

## Детальна інструкція з скріншотами

### В Railway Dashboard:

1. **Відкрити проект:**
   - Dashboard → "ZkPersona" project

2. **Відкрити налаштування сервісу:**
   - Натиснути на ваш backend service
   - Або натиснути на три крапки (⋯) → "Settings"

3. **Знайти "Source" або "Root Directory":**
   - В секції "Source" або "Configuration"
   - Поле "Root Directory" або "Working Directory"

4. **Встановити значення:**
   ```
   backend
   ```

5. **Зберегти:**
   - Натиснути "Save" або "Update"

6. **Redeploy:**
   - Перейти на "Deployments"
   - Натиснути "Redeploy" або зробити новий commit

---

## Якщо все одно не працює

### Варіант A: Створити окремий репозиторій для backend

1. Створити новий репозиторій `zkpersona-backend`
2. Скопіювати вміст папки `backend/` в корінь нового репозиторію
3. Deploy з нового репозиторію

### Варіант B: Використати Render.com

Render.com краще підтримує monorepo структуру:

1. New Web Service → Connect GitHub
2. Root Directory: `backend`
3. Build Command: `npm install`
4. Start Command: `npm start`

---

## Швидке рішення (зараз)

**Найпростіше - встановити Root Directory в Railway:**

1. Railway Dashboard → ваш проект
2. Settings → Root Directory → `backend`
3. Save → Redeploy

Готово! ✅
