# DecimalChain Integration для TAPDEL

## 📋 Обзор

Интеграция DecimalChain добавляет в игру TAPDEL возможность депозитов и выводов реальной криптовалюты DEL. Система использует уникальные суммы депозитов для автоматического сопоставления транзакций с пользователями.

## 🏗️ Архитектура

### Backend компоненты:
- `config/decimal.js` - Конфигурация DecimalChain
- `services/decimalService.js` - Основной сервис для работы с блокчейном
- `routes/decimal.js` - API маршруты для депозитов/выводов

### Frontend компоненты:
- `services/decimalApi.ts` - API клиент для DecimalChain
- `components/Wallet.tsx` - Интерфейс кошелька
- DEL баланс в `gameStore.ts`

### База данных:
- `deposits` - Коллекция депозитов
- `withdrawals` - Коллекция выводов
- `users.gameBalance` - DEL баланс пользователей

## 🚀 Настройка

### 1. Установка зависимостей

```bash
cd backend
npm install web3@^4.3.0 redis@^4.6.0
```

### 2. Переменные окружения

Создайте `.env` файл в папке `backend/`:

```env
# DecimalChain Configuration
DECIMAL_RPC_URL=https://node.decimalchain.com/web3/
DECIMAL_CHAIN_ID=75
DECIMAL_GAS_PRICE_GWEI=50000
DECIMAL_CONFIRMATIONS=6
DECIMAL_UNIQUE_SCALE=0.000001

# DecimalChain Wallet
DECIMAL_WORKING_ADDRESS=xdc1234567890abcdef1234567890abcdef12345678
DECIMAL_WORKING_PRIVKEY_ENC=base64_encrypted_private_key_here
DECIMAL_KEY_PASSPHRASE=your_secure_passphrase_here

# Redis Configuration  
REDIS_URL=redis://localhost:6379/0
```

### 3. Шифрование приватного ключа

```bash
npm run encrypt-key
```

Следуйте инструкциям для безопасного шифрования вашего приватного ключа.

### 4. Тестирование подключения

```bash
npm run test-decimal
```

## 💰 Принцип работы

### Депозиты

1. Пользователь запрашивает депозит на сумму X DEL
2. Система генерирует уникальную сумму: X + уникальный_модификатор
3. Пользователь отправляет точную уникальную сумму на рабочий адрес
4. Система мониторит блокчейн и находит транзакцию по уникальной сумме
5. После подтверждений баланс пользователя пополняется

### Выводы

1. Пользователь запрашивает вывод указывая адрес и сумму
2. Система списывает DEL с игрового баланса
3. Запрос попадает в очередь на обработку
4. Воркер автоматически отправляет транзакцию
5. Пользователь получает DEL на указанный адрес

### Уникальные суммы

Для каждого пользователя генерируется уникальный модификатор:
```javascript
const userIdHash = crypto.createHash('md5').update(userId).digest('hex');
const userMod = parseInt(userIdHash.substring(0, 8), 16) % 1000;
const uniqueModifier = userMod * 0.000001; // DECIMAL_UNIQUE_SCALE
const uniqueAmount = baseAmount + uniqueModifier;
```

Примеры:
- Пользователь A: 1.0 → 1.000234 DEL
- Пользователь B: 1.0 → 1.000567 DEL

## 🔧 API Endpoints

### Депозиты

- `POST /api/decimal/deposits` - Создать депозит
- `GET /api/decimal/deposits/:id` - Статус депозита
- `GET /api/decimal/users/:userId/deposits` - История депозитов пользователя

### Выводы

- `POST /api/decimal/withdrawals` - Создать вывод
- `GET /api/decimal/withdrawals/:id` - Статус вывода
- `GET /api/decimal/users/:userId/withdrawals` - История выводов пользователя

### Баланс

- `GET /api/decimal/users/:userId/balance` - DEL баланс пользователя
- `GET /api/decimal/info` - Информация о системе

## 🔒 Безопасность

### Приватный ключ

- Хранится в зашифрованном виде в переменных окружения
- Расшифровывается только при необходимости транзакции
- Сразу очищается из памяти после использования

### Nonce управление

- Redis кэширование nonce для предотвращения коллизий
- Автоматическое обновление при каждой транзакции

### Валидация адресов

- Проверка формата DecimalChain адресов (xdc... или 0x...)
- Проверка минимальных сумм (0.001 DEL)

## 📊 Мониторинг

### Блокчейн

- Сканирование новых блоков каждые 10 секунд
- Отслеживание подтверждений каждые 15 секунд
- Обработка выводов каждые 5 секунд

### Логи

- Детальное логирование всех операций
- Отслеживание статусов транзакций
- Уведомления об ошибках

## 🧪 Тестирование

```bash
# Тест подключения
npm run test-decimal

# Ручное тестирование депозита
curl -X POST http://localhost:3000/api/decimal/deposits \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user", "baseAmount": 1.0}'

# Проверка баланса
curl http://localhost:3000/api/decimal/users/test-user/balance
```

## 📱 Пользовательский интерфейс

### Кошелек

- Отображение DEL баланса
- Создание депозитов с QR-кодами
- Инициация выводов
- История операций

### Интеграция в игру

- Кнопка кошелька в профиле
- Отображение баланса в реальном времени
- Уведомления о поступлениях

## ⚠️ Важные замечания

1. **Redis обязателен** для корректной работы nonce и кэширования
2. **Рабочий кошелек** должен иметь достаточно DEL для комиссий
3. **Резервные копии** приватного ключа храните в безопасном месте
4. **Мониторинг** блокчейна работает только при запущенном сервере
5. **Production** использует переменные окружения, не .env файлы

## 🚀 Развертывание

### Render.com

Добавьте переменные окружения в панель Render:

```
DECIMAL_RPC_URL=https://node.decimalchain.com/web3/
DECIMAL_WORKING_ADDRESS=your_address
DECIMAL_WORKING_PRIVKEY_ENC=your_encrypted_key
DECIMAL_KEY_PASSPHRASE=your_passphrase
REDIS_URL=redis://your_redis_instance
```

### Redis

Используйте управляемый Redis сервис:
- Render Redis
- AWS ElastiCache  
- Redis Cloud
- DigitalOcean Managed Redis

## 📞 Поддержка

При возникновении проблем:

1. Проверьте логи сервера
2. Запустите `npm run test-decimal`
3. Убедитесь что Redis доступен
4. Проверьте баланс рабочего кошелька
5. Проверьте переменные окружения

---

*Интеграция разработана для TAPDEL - кибerpunk Telegram mini-app* 