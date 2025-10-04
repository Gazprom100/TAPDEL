# 🔧 Настройка переменных окружения в Vercel

## 📋 Необходимые переменные окружения

Для работы с новыми сервисами Redis и Supabase, добавьте следующие переменные в настройках проекта Vercel:

### 1. MongoDB (уже настроено)
```env
MONGODB_URI=mongodb+srv://TAPDEL:fpz%25sE62KPzmHfM@cluster0.ejo8obw.mongodb.net/tapdel?retryWrites=true&w=majority&appName=Cluster0
MONGODB_DB=tapdel
```

### 2. Redis (новый сервис)
```env
REDIS_URL=redis://default:your_redis_password@your_redis_host:port
```

**Как получить Redis URL:**
1. В панели Vercel перейдите в раздел "Storage"
2. Создайте новый Redis KV Store
3. Скопируйте URL подключения
4. Добавьте его как переменную `REDIS_URL`

### 3. Supabase (новый сервис)
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_JWT_SECRET=your_supabase_jwt_secret
```

**Как получить Supabase ключи:**
1. В панели Supabase перейдите в Settings > API
2. Скопируйте:
   - Project URL → `SUPABASE_URL`
   - anon public → `SUPABASE_ANON_KEY`
   - service_role secret → `SUPABASE_SERVICE_ROLE_KEY`
   - JWT Secret → `SUPABASE_JWT_SECRET`

### 4. Дополнительные переменные (опционально)
```env
# DecimalChain (если нужна интеграция с блокчейном)
DECIMAL_API_BASE_URL=https://api.decimalchain.com/api/v1
DECIMAL_RPC_URL=https://node.decimalchain.com/web3/
DECIMAL_CHAIN_ID=75
DECIMAL_GAS_PRICE_GWEI=50000
DECIMAL_CONFIRMATIONS=6
DECIMAL_WORKING_ADDRESS=your_working_address
DECIMAL_WORKING_PRIVKEY_ENC=your_encrypted_private_key
DECIMAL_KEY_PASSPHRASE=your_passphrase

# Telegram Bot (если нужна интеграция с Telegram)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_WEBHOOK_URL=https://your-app.vercel.app/api/telegram

# Внутренняя безопасность
INTERNAL_SECRET=your_internal_secret_key

# Конфигурация приложения
NODE_ENV=production
PORT=3001
APP_URL=https://your-app.vercel.app
```

## 🚀 Пошаговая настройка

### Шаг 1: Настройка Redis в Vercel
1. Откройте панель Vercel
2. Перейдите в ваш проект
3. Откройте вкладку "Storage"
4. Нажмите "Create Database"
5. Выберите "Redis KV"
6. Дайте название (например: "tapdel-redis")
7. Скопируйте URL подключения
8. Добавьте его как переменную `REDIS_URL`

### Шаг 2: Настройка Supabase
1. Откройте [Supabase](https://supabase.com)
2. Создайте новый проект
3. Дождитесь завершения инициализации
4. Перейдите в Settings > API
5. Скопируйте все необходимые ключи
6. Добавьте их как переменные в Vercel

### Шаг 3: Создание таблиц в Supabase
1. Откройте Supabase Dashboard
2. Перейдите в SQL Editor
3. Выполните SQL скрипт из файла `supabase_tables.sql` (будет создан после миграции)

### Шаг 4: Миграция данных
После настройки переменных окружения:
```bash
# Проверка сервисов
npm run check:services

# Миграция данных в Supabase
npm run migrate:supabase
```

## 🔍 Проверка настройки

После добавления всех переменных окружения, проверьте настройку:

```bash
# Проверка новых сервисов
npm run check:services

# Полная проверка системы
npm run check:system
```

## 📊 Ожидаемый результат

После правильной настройки вы должны увидеть:
```
Redis: ✅ OK
Supabase: ✅ OK
Cache Service: ✅ OK
```

## 🆘 Устранение неполадок

### Redis не подключается
- Проверьте, что Redis KV Store создан в Vercel
- Убедитесь, что URL скопирован правильно
- Проверьте, что проект не заблокирован

### Supabase не подключается
- Проверьте, что все ключи скопированы правильно
- Убедитесь, что проект Supabase активен
- Проверьте, что таблицы созданы

### Ошибки миграции
- Убедитесь, что MongoDB доступен
- Проверьте, что Supabase таблицы созданы
- Проверьте права доступа к Supabase

---

**После настройки всех переменных окружения система будет готова к работе с новыми сервисами! 🎉**
