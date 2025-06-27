# TAPDEL - Мобильная игра-тап

## Описание

TAPDEL - это мобильная игра-тап с элементами киберпанка, где игроки могут:
- Тапать для заработка токенов
- Улучшать компоненты автомобиля
- Соревноваться в таблице лидеров
- Интегрироваться с Telegram

## Технологии

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Zustand
- **Backend**: Node.js, Express, MongoDB
- **Deploy**: Render

## Установка и запуск

### Требования
- Node.js >= 18.0.0
- MongoDB Atlas аккаунт
- Telegram Bot Token

### Локальная разработка

1. **Клонируйте репозиторий:**
```bash
git clone https://github.com/Gazprom100/TAPDEL.git
cd TAPDEL
```

2. **Установите зависимости:**
```bash
npm install
```

3. **Настройте переменные окружения:**
Создайте файл `.env` в корне проекта:
```env
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
MONGODB_DB=tapdel

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_WEBHOOK_URL=https://your-app.com/webhook

# App Configuration
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# Client Configuration
VITE_API_URL=/api
```

4. **Соберите проект:**
```bash
npm run build
```

5. **Запустите сервер:**
```bash
npm start
```

Приложение будет доступно по адресу: http://localhost:3000

### Разработка фронтенда

Для разработки фронтенда с hot reload:

1. **Запустите бэкенд сервер:**
```bash
npm start
```

2. **В новом терминале запустите dev сервер:**
```bash
npm run dev
```

Фронтенд будет доступен по адресу: http://localhost:5173
API запросы будут проксироваться на http://localhost:3000

## Структура проекта

```
TAPDEL/
├── src/                    # Клиентский код
│   ├── components/         # React компоненты
│   ├── store/             # Zustand store
│   ├── services/          # API сервисы
│   ├── types/             # TypeScript типы
│   └── styles/            # CSS стили
├── backend/               # Серверный код
│   ├── routes/            # Express роуты
│   ├── services/          # Бэкенд сервисы
│   └── server.js          # Основной сервер
├── dist/                  # Собранные файлы
└── package.json
```

## API Endpoints

### Пользователи
- `GET /api/users/:userId` - Получить данные пользователя
- `PUT /api/users/:userId` - Обновить пользователя
- `PUT /api/users/:userId/gamestate` - Обновить состояние игры
- `POST /api/users/:userId/transactions` - Добавить транзакцию
- `GET /api/users/:userId/rank` - Получить рейтинг пользователя

### Таблица лидеров
- `GET /api/leaderboard` - Получить таблицу лидеров
- `POST /api/leaderboard` - Обновить запись в таблице лидеров

### Telegram
- `POST /api/telegram/webhook` - Webhook для Telegram бота

## Игровая механика

### Компоненты автомобиля
1. **Двигатель** - влияет на мощность и эффективность топлива
2. **Коробка передач** - влияет на количество передач
3. **Батарея** - влияет на накопление энергии
4. **Гипердвигатель** - дает временные бонусы
5. **Энергосеть** - влияет на общую эффективность

### Передачи
- N (Neutral) - базовый множитель
- 1-4 - увеличивающиеся множители
- M (Manual) - максимальный множитель

### Система энергии
- Топливо расходуется при тапах
- Восстанавливается со временем
- Можно улучшать максимальный уровень и скорость восстановления

## Deploy на Render

Проект настроен для автоматического деплоя на Render.com:

1. Подключите GitHub репозиторий к Render
2. Настройте переменные окружения в Render Dashboard
3. Деплой происходит автоматически при push в main ветку

## Лицензия

MIT License 