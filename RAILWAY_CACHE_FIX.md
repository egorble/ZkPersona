# 🔧 Виправлення: Railway все одно виконує "backend" як команду

## Проблема

Навіть якщо Root Directory встановлено на `backend`, Railway все одно намагається виконати `backend` як команду:
```
▸ build
$ backend
```

## Причина

Railway (Railpack/NIXPACKS) використовує кешовану конфігурацію або автоматично визначає build команду неправильно.

## Рішення

### 1. Оновити backend/railway.json

Додано явний `buildCommand` в `backend/railway.json`:
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm ci"
  }
}
```

Це явно вказує Railway, що build команда - це `npm ci`, а не `backend`.

### 2. Очистити кеш Railway

**В Railway Dashboard:**

1. Settings → Build
2. Знайти опцію "Clear Build Cache" або "Invalidate Cache"
3. Натиснути (якщо є)

**Або через redeploy:**

1. Deployments → три крапки (⋯) на останньому deployment
2. "Redeploy" або "Clear Cache and Redeploy"

### 3. Перевірити Root Directory

Переконатися, що Root Directory = `backend` (без слеша):
1. Settings → Source → Root Directory
2. Має бути: `backend` (не `/backend`, не `./backend`)

### 4. Зробити новий commit

Іноді Railway не оновлює конфігурацію без нового commit:

```bash
git add backend/railway.json
git commit -m "Fix Railway build command"
git push
```

---

## Альтернативне рішення: Використати Render.com

Якщо Railway продовжує мати проблеми, можна використати Render.com:

1. [render.com](https://render.com) → New Web Service
2. Connect GitHub → вибрати репозиторій
3. Root Directory: `backend`
4. Build Command: `npm install`
5. Start Command: `npm start`

Render.com краще працює з monorepo структурою.

---

## Перевірка

Після оновлення `backend/railway.json` та redeploy, в логах має бути:

```
✓ Running: npm ci
✓ Running: npm start
```

**НЕ має бути:**
```
✖ backend: not found
```

---

## Якщо все одно не працює

1. **Перевірити, що `backend/railway.json` оновлено** (має містити `buildCommand: "npm ci"`)
2. **Зробити commit і push** в GitHub
3. **Зробити redeploy** в Railway
4. **Перевірити логи** - має бути `npm ci`, а не `backend`
5. **Якщо не допомагає** - спробувати Render.com або звернутися до Railway support

---

## Важливо

- `backend/railway.json` тепер має явний `buildCommand: "npm ci"`
- Root Directory має бути `backend` (без слеша)
- Після змін обов'язково зробити commit і redeploy
