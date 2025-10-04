# 🚀 Руководство по настройке TAPDEL на Vercel

## 📋 Предварительные требования

1. **Node.js** версии 18 или выше
2. **MongoDB Atlas** аккаунт (бесплатный)
3. **Vercel** аккаунт
4. **Git** для управления версиями

## 🔧 Настройка базы данных

### 1. Создание кластера MongoDB Atlas

1. Зайдите на [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Создайте новый кластер (выберите бесплатный план M0)
3. Выберите регион ближайший к вам
4. Создайте пользователя базы данных:
   - Username: `TAPDEL`
   - Password: `fpz%25sE62KPzmHfM` (уже закодированный)
5. Добавьте IP-адрес `0.0.0.0/0` в Network Access (для доступа с Vercel)

### 2. Получение строки подключения

1. В MongoDB Atlas нажмите "Connect"
2. Выберите "Connect your application"
3. Скопируйте строку подключения
4. Замените `<password>` на `fpz%25sE62KPzmHfM`
5. Замените `<dbname>` на `tapdel`

Итоговая строка должна выглядеть так:
```
mongodb+srv://TAPDEL:fpz%25sE62KPzmHfM@cluster0.ejo8obw.mongodb.net/tapdel?retryWrites=true&w=majority&appName=Cluster0
```

## 🌐 Настройка Vercel

### 1. Подключение репозитория

1. Зайдите на [Vercel](https://vercel.com)
2. Нажмите "New Project"
3. Подключите ваш GitHub репозиторий
4. Выберите папку `backend` как Root Directory

### 2. Настройка переменных окружения

В настройках проекта Vercel добавьте следующие переменные:

```env
# База данных
MONGODB_URI=mongodb+srv://TAPDEL:fpz%25sE62KPzmHfM@cluster0.ejo8obw.mongodb.net/tapdel?retryWrites=true&w=majority&appName=Cluster0
MONGODB_DB=tapdel

# DecimalChain (опционально)
DECIMAL_API_BASE_URL=https://api.decimalchain.com/api/v1
DECIMAL_RPC_URL=https://node.decimalchain.com/web3/
DECIMAL_CHAIN_ID=75
DECIMAL_GAS_PRICE_GWEI=50000
DECIMAL_CONFIRMATIONS=6

# Telegram Bot (опционально)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_WEBHOOK_URL=https://your-app.vercel.app/api/telegram

# Redis (опционально)
REDIS_URL=your_redis_url

# Внутренний секрет для API
INTERNAL_SECRET=your_secret_key
```

### 3. Настройка сборки

В настройках сборки Vercel:
- **Build Command**: `npm install`
- **Output Directory**: `backend`
- **Install Command**: `npm install`

## 🚀 Запуск и проверка

### 1. Локальная проверка

```bash
# Установка зависимостей
cd backend
npm install

# Проверка базы данных
npm run check:db

# Проверка системы
npm run check:system

# Запуск сервера
npm start
```

### 2. Проверка API

После запуска сервера проверьте следующие эндпоинты:

```bash
# Health check
curl http://localhost:3001/api/health

# Test endpoint
curl http://localhost:3001/api/test

# Leaderboard
curl http://localhost:3001/api/leaderboard

# Admin statistics
curl http://localhost:3001/api/admin/statistics
```

### 3. Проверка на Vercel

После деплоя на Vercel проверьте:

```bash
# Замените YOUR_APP_URL на ваш URL Vercel
curl https://YOUR_APP_URL.vercel.app/api/health
curl https://YOUR_APP_URL.vercel.app/api/test
```

## 📊 Структура базы данных

После инициализации в базе данных будут созданы следующие коллекции:

- **users** - пользователи игры
- **leaderboard** - таблица лидеров
- **deposits** - депозиты (для DecimalChain)
- **withdrawals** - выводы (для DecimalChain)
- **adminSettings** - настройки админ-панели
- **system_config** - системная конфигурация
- **token_history** - история изменений токенов

## 🔧 Устранение неполадок

### Проблема: Не удается подключиться к MongoDB

**Решение:**
1. Проверьте строку подключения в переменных окружения
2. Убедитесь, что IP-адрес `0.0.0.0/0` добавлен в Network Access
3. Проверьте, что пароль правильно закодирован (`%25` вместо `%`)

### Проблема: API возвращает 500 ошибку

**Решение:**
1. Проверьте логи Vercel в панели управления
2. Убедитесь, что все переменные окружения настроены
3. Запустите `npm run check:system` для диагностики

### Проблема: Коллекции не создаются

**Решение:**
1. Запустите `npm run check:db` для создания коллекций и индексов
2. Проверьте права доступа пользователя MongoDB
3. Убедитесь, что база данных `tapdel` существует

## 📝 Полезные команды

```bash
# Проверка базы данных
npm run check:db

# Проверка API
npm run check:api

# Полная проверка системы
npm run check:system

# Запуск в режиме разработки
npm run dev

# Запуск продакшн сервера
npm start
```

## 🎯 Следующие шаги

1. **Настройте DecimalChain** (если нужна интеграция с блокчейном)
2. **Настройте Telegram Bot** (если нужна интеграция с Telegram)
3. **Настройте Redis** (для кеширования и rate limiting)
4. **Настройте мониторинг** (логи, метрики, алерты)

## 📞 Поддержка

Если у вас возникли проблемы:

1. Проверьте логи в панели Vercel
2. Запустите диагностические скрипты
3. Проверьте настройки переменных окружения
4. Убедитесь, что все зависимости установлены

---

**Удачного деплоя! 🚀**
