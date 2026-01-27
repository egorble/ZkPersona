# Виправлення помилки Railway: "backend: not found"

## Проблема

Railway намагається виконати `backend` як команду в build step:
```
sh: 1: backend: not found
```

Це відбувається тому, що Railway не знає, що `backend` - це папка, а не команда.

## Рішення: Встановити Root Directory в Railway

**Це обов'язковий крок!** Без цього Railway не знатиме де знаходиться `package.json`.

### Крок 1: Відкрити Settings сервісу

1. Railway Dashboard → ваш проект "ZkPersona"
2. Натиснути на ваш backend service (або на три крапки ⋯ → Settings)
3. Перейти на вкладку **"Settings"** (⚙️)

### Крок 2: Встановити Root Directory

1. Знайти секцію **"Source"** або **"Root Directory"** або **"Working Directory"**
2. Встановити значення: `backend`
3. Натиснути **"Save"** або **"Update"**

### Крок 3: Redeploy

1. Перейти на вкладку **"Deployments"**
2. Натиснути **"Redeploy"** або зробити новий commit в GitHub

---

## Чому це важливо?

Коли Root Directory встановлено на `backend`:
- Railway знаходить `backend/package.json`
- Railway використовує `backend/railway.json` (якщо є)
- Команди `npm install` та `npm start` виконуються в правильній директорії

Без Root Directory:
- Railway шукає `package.json` в корені репозиторію
- Не знаходить його
- Намагається виконати `backend` як команду → помилка

---

## Перевірка

Після встановлення Root Directory на `backend`, в логах Railway має з'явитися:

```
✓ Detected Node.js project
✓ Running: npm install
✓ Running: npm start
```

Замість:
```
✖ backend: not found
```

---

## Файли конфігурації

- ✅ `backend/railway.json` - правильна конфігурація (використовується коли Root Directory = `backend`)
- ❌ `railway.json` в корені - видалено (не потрібен, якщо Root Directory встановлено)

---

## Швидке рішення

1. Railway Dashboard → Settings → Root Directory → `backend`
2. Save → Redeploy

Готово! ✅
