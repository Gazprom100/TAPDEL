# TAPDEL - Cyberpunk Tapper Game

Современная игра-таппер в стиле киберпанк с интеграцией Telegram.

## Environment Variables

The following environment variables are required for the application to work properly:

```env
# Server Configuration
PORT=3000                    # Main Express server port
WEBHOOK_PORT=3001            # Telegram webhook port (must be different from PORT)
NODE_ENV=development         # Environment: development or production

# Application URLs
APP_URL=http://localhost:3000       # Your application URL
VITE_API_URL=http://localhost:3000  # API URL for client

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_here  # Your Telegram bot token

# MongoDB Configuration
VITE_MONGODB_URI=mongodb://localhost:27017/tapdel  # MongoDB connection string
```

## Project Structure

```
├── src/                    # Frontend source code
│   ├── components/         # React components
│   ├── utils/             # Utility functions
│   ├── services/          # API services
│   ├── hooks/             # Custom React hooks
│   ├── store/             # State management
│   ├── styles/            # CSS and style files
│   └── types/             # TypeScript type definitions
│
├── backend/               # Backend source code
│   └── server.js         # Express server and bot configuration
│
├── dist/                 # Built frontend files
├── public/              # Static files
└── package.json        # Project dependencies and scripts
```

## Особенности

- 🎮 Увлекательная механика тапов с системой энергии
- 💫 Плавные анимации и визуальные эффекты
- 🎵 Звуковые эффекты и тактильный отклик
- 🔋 Система управления энергией
- 💰 Токены и улучшения
- 🌈 UI в стиле киберпанк
- 🤖 Интеграция с Telegram ботом

## Технологии

- React + TypeScript
- Vite
- TailwindCSS
- GSAP для анимаций
- Zustand для управления состоянием
- Telegram Bot API

## Разработка

1. Установка зависимостей:
```bash
npm install
```

2. Создайте файл `.env` в корне проекта:
```
VITE_TELEGRAM_BOT_TOKEN=ваш_токен_бота
```

3. Запуск сервера разработки:
```bash
npm run dev
```

4. Сборка для production:
```bash
npm run build
```

## Деплой на Render.com

1. Создайте аккаунт на [Render.com](https://render.com)

2. Создайте новый Web Service:
   - Подключите ваш GitHub репозиторий
   - Выберите ветку для деплоя
   - Укажите тип "Static Site"
   - Укажите команду сборки: `npm install && npm run build`
   - Укажите директорию публикации: `dist`

3. Добавьте переменные окружения:
   - `VITE_TELEGRAM_BOT_TOKEN` - токен вашего Telegram бота

4. Настройки деплоя уже определены в файле `render.yaml`

## Важные команды

- `npm run dev` - запуск сервера разработки
- `npm run build` - сборка проекта
- `npm start` - запуск production сервера
- `npm run lint` - проверка кода

## Требования

- Node.js >= 18.0.0
- NPM >= 8.0.0

## Лицензия

MIT License - см. файл LICENSE 