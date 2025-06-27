const express = require('express');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

// Bot initialization
const token = process.env.TELEGRAM_BOT_TOKEN;
const isProduction = process.env.NODE_ENV === 'production';
const url = process.env.APP_URL || 'https://tapdel.onrender.com';

let bot = null;
try {
  if (token) {
    const options = isProduction
      ? {
          webHook: {
            port: PORT
          }
        }
      : {
          polling: true
        };
    
    bot = new TelegramBot(token, options);
    console.log('Telegram bot initialized successfully');
    
    if (isProduction) {
      const webhookPath = `/webhook/${token}`;
      const webhookUrl = `${url}${webhookPath}`;
      
      bot.setWebHook(webhookUrl)
        .then(() => {
          console.log('Webhook set successfully:', webhookUrl);
        })
        .catch((error) => {
          console.error('Failed to set webhook:', error);
        });

      app.post(webhookPath, (req, res) => {
        bot.handleUpdate(req.body);
        res.sendStatus(200);
      });
    }
  } else {
    console.warn('TELEGRAM_BOT_TOKEN not provided. Bot functionality will be disabled.');
  }
} catch (error) {
  console.error('Failed to initialize Telegram bot:', error);
  if (isProduction) {
    console.warn('Running in production without bot functionality');
  }
}

// User chat IDs storage
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

// Bot commands
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

// Start server
const server = app.listen(PORT, () => {
  console.log('==> Server Configuration:');
  console.log(`Port: ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`App URL: ${url}`);
  console.log(`Bot Status: ${bot ? 'Active' : 'Disabled'}`);
  if (!bot) {
    console.log('Note: Running without Telegram bot functionality');
  }
  console.log('==> Server is ready to handle requests');
});

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('\nStarting graceful shutdown...');
  
  if (bot) {
    if (isProduction) {
      try {
        await bot.deleteWebHook();
        console.log('Webhook removed');
      } catch (error) {
        console.error('Error removing webhook:', error);
      }
    } else {
      try {
        await bot.stopPolling();
        console.log('Bot polling stopped');
      } catch (error) {
        console.error('Error stopping bot:', error);
      }
    }
  }
  
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
  
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 5000);
};

// Signal handlers
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown();
}); 