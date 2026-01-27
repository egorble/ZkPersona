# Швидкий Deployment - Backend завжди працює

## 🚀 Варіант 1: Railway (Найпростіше - 5 хвилин)

### Крок 1: Створити проект
1. Зайти на [railway.app](https://railway.app)
2. Sign up / Login
3. New Project → Deploy from GitHub repo
4. Вибрати ваш репозиторій

### Крок 1.5: ⚠️ ВАЖЛИВО - Встановити Root Directory
1. Після створення проекту, натиснути на ваш сервіс
2. Перейти на вкладку **"Settings"** (⚙️)
3. Знайти секцію **"Source"** або **"Root Directory"**
4. Встановити значення: `backend`
5. Зберегти зміни

**Без цього Railway не зможе знайти `package.json` і deployment не спрацює!**

### Крок 2: Додати Environment Variables
В Railway dashboard → Variables → Add Variable:

```env
BACKEND_URL=https://your-app-name.railway.app
FRONTEND_URL=https://your-frontend-domain.com

DISCORD_CLIENT_ID=1462782452702511271
DISCORD_CLIENT_SECRET=SpG41UWGAEa1rT6ECkckNeERQRhoaXql

TIKTOK_CLIENT_ID=awuelncpgc77ti0b
TIKTOK_CLIENT_SECRET=xulR7o8NKFF0LyN75eH7PPVc68mfK5j4

TELEGRAM_BOT_TOKEN=8253687777:AAFh7JxVTHFbn-ui8yOW4oW3h7agJHtYKZo
TELEGRAM_BOT_USERNAME=zkpersona_bot

SECRET_SALT=your-production-secret-salt
NODE_ENV=production
```

### Крок 3: Отримати URL
Railway автоматично надасть URL типу: `https://your-app-name.railway.app`

### Крок 4: Оновити OAuth Redirect URIs

**Discord:**
1. [Discord Developer Portal](https://discord.com/developers/applications)
2. Ваш OAuth додаток → OAuth2 → Redirects
3. Додати: `https://your-app-name.railway.app/auth/discord/callback`

**TikTok:**
1. [TikTok Developer Portal](https://developers.tiktok.com/)
2. Ваш OAuth додаток → Redirect URI
3. Додати: `https://your-app-name.railway.app/auth/tiktok/callback`

### Крок 5: Оновити Frontend

Створити `frontend/.env.production`:
```env
VITE_BACKEND_URL=https://your-app-name.railway.app
```

**Готово!** Backend працює завжди на Railway. 🎉

---

## 🚀 Варіант 2: Render (Альтернатива)

### Крок 1: Створити Web Service
1. Зайти на [render.com](https://render.com)
2. New → Web Service
3. Connect GitHub → Вибрати репозиторій
4. Налаштувати:
   - **Name:** `zkpersona-backend`
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`

### Крок 2: Додати Environment Variables
В Render dashboard → Environment → Add Environment Variable (ті самі, що для Railway)

### Крок 3: Отримати URL
Render надасть URL типу: `https://zkpersona-backend.onrender.com`

### Крок 4-5: Як для Railway (оновіть OAuth URIs та frontend)

---

## 🖥️ Варіант 3: VPS з PM2 (Для повного контролю)

### Крок 1: Підключитися до VPS
```bash
ssh user@your-server-ip
```

### Крок 2: Встановити Node.js та PM2
```bash
# Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 для постійної роботи
sudo npm install -g pm2
```

### Крок 3: Клонувати та налаштувати
```bash
git clone https://github.com/your-username/zkpersona.git
cd zkpersona/backend
npm install

# Створити .env
nano .env
# Додати всі environment variables (як для Railway)
```

### Крок 4: Запустити з PM2
```bash
# Запустити backend (працює завжди)
pm2 start ecosystem.config.js

# Зберегти для автозапуску при перезавантаженні
pm2 save
pm2 startup
```

### Крок 5: Налаштувати домен (опціонально)
```bash
# Nginx
sudo apt install nginx
sudo nano /etc/nginx/sites-available/zkpersona-backend
```

Nginx config:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/zkpersona-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# SSL (Let's Encrypt)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## ✅ Перевірка

Після deployment перевірити:

```bash
# Health check
curl https://your-backend-domain.com/health

# Config status
curl https://your-backend-domain.com/config/status
```

**Очікуваний результат:**
```json
{
  "status": "ok",
  "providers": {
    "discord": { "configured": true },
    "telegram": { "configured": true },
    "tiktok": { "configured": true }
  }
}
```

---

## 🔄 Оновлення Frontend

### Для Production Build:

1. Створити `frontend/.env.production`:
```env
VITE_BACKEND_URL=https://your-backend-domain.com
```

2. Build frontend:
```bash
cd frontend
npm run build
```

3. Deploy `dist/` на Vercel/Netlify/VPS

---

## 📝 Важливі нотатки

1. **Railway/Render автоматично перезапускають** при push в GitHub
2. **PM2 на VPS** - потрібно вручну оновлювати (`git pull && pm2 restart`)
3. **OAuth Redirect URIs** - обов'язково оновити в провайдерів
4. **HTTPS** - обов'язково для production (Railway/Render надають автоматично)

---

## 🎯 Рекомендація

**Для швидкого старту:** Railway (5 хвилин, автоматичний deployment)
**Для production:** Railway або VPS з PM2 (повний контроль)

Backend буде працювати завжди! ✅
