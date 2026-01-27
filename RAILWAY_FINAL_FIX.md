# ✅ Фінальне виправлення Railway

## Проблема

Root Directory встановлено на `/backend`, але Railway все одно намагається виконати `backend` як команду:
```
▸ build
$ backend
```

## Рішення

### 1. Змінити Root Directory з `/backend` на `backend` (без слеша)

**В Railway Dashboard:**

1. Settings → Source → Root Directory
2. Змінити з `/backend` на `backend` (без слеша на початку)
3. Save
4. Deployments → Redeploy

### 2. Видалено railway.json з кореня

`railway.json` в корені конфліктував з Root Directory. Тепер Railway використовує тільки `backend/railway.json`.

### 3. Перевірити backend/railway.json

Файл `backend/railway.json` має бути:
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start"
  }
}
```

---

## Покрокова інструкція

### Крок 1: Змінити Root Directory

1. Railway Dashboard → ваш проект "ZkPersona"
2. Settings → Source
3. Root Directory: змінити `/backend` → `backend` (без слеша!)
4. Save

### Крок 2: Redeploy

1. Deployments → Redeploy
2. Або зробити новий commit в GitHub

### Крок 3: Перевірити логи

Після redeploy в логах має бути:
```
✓ Running: npm ci
✓ Running: npm start
```

**НЕ має бути:**
```
✖ backend: not found
```

---

## Важливо

- Root Directory має бути `backend` (без слеша `/`)
- `railway.json` в корені видалено (не потрібен, коли Root Directory встановлено)
- `backend/railway.json` використовується автоматично

---

## Якщо все одно не працює

1. Перевірити, що Root Directory = `backend` (не `/backend`)
2. Перевірити, що збережено зміни
3. Зробити redeploy
4. Перевірити, що `backend/package.json` існує
5. Перевірити, що `backend/railway.json` правильний

---

## Docker connection error

Якщо бачите помилку:
```
ERROR: failed to build: listing workers for Build: failed to list workers: Unavailable: connection error
```

Це тимчасова проблема Railway infrastructure. Спробуйте:
1. Зачекати 1-2 хвилини
2. Зробити redeploy
3. Якщо не допомагає - звернутися до Railway support

---

## Очікуваний результат

Після виправлення Root Directory на `backend` (без слеша), в логах має бути:

```
✓ Detected Node.js project
✓ Running: npm ci
✓ Running: npm start
```

Backend має запуститися успішно! ✅
