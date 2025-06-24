import express from 'express';
import cors from 'cors';
import TelegramBot from 'node-telegram-bot-api';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

// Инициализация бота
const token = process.env.VITE_TELEGRAM_BOT_TOKEN;
if (!token) {
  console.warn('Telegram Bot Token not provided. Bot functionality will be disabled.');
}

const bot = token ? new TelegramBot(token, {
  polling: true,
  webHook: false,
  onlyFirstMatch: true
}) : null;

// Хранилище чат ID пользователей
const userChatIds = new Map();

// API endpoints
app.post('/api/telegram/register', (req, res) => {
  const { chatId } = req.body;
  if (!bot) {
    return res.status(503).json({ error: 'Telegram bot is not available' });
  }
  userChatIds.set(chatId, true);
  res.json({ success: true });
});

app.post('/api/telegram/notify', async (req, res) => {
  const { chatId, message } = req.body;
  if (!bot) {
    return res.status(503).json({ error: 'Telegram bot is not available' });
  }
  try {
    await bot.sendMessage(chatId, message);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Обработка команд бота
if (bot) {
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    userChatIds.set(chatId, true);
    bot.sendMessage(chatId, 'Привет! Я бот игры TAPDEL. Ваш ID чата: ' + chatId);
  });
}

// Serve SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Запуск сервера
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('==> Your service is live 🎉');
});

// Обработка сигналов завершения
const gracefulShutdown = async () => {
  console.log('\nStarting graceful shutdown...');
  
  // Останавливаем polling бота
  try {
    await bot.stopPolling();
    console.log('Bot polling stopped');
  } catch (error) {
    console.error('Error stopping bot:', error);
  }
  
  // Закрываем HTTP сервер
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
  
  // Если сервер не закрылся через 5 секунд, выходим принудительно
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 5000);
};

// Обработчики сигналов
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Обработка необработанных ошибок
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown();
}); 