const express = require('express');
const router = express.Router();
const botService = require('../services/botService');

// Регистрация чат ID
router.post('/register', (req, res) => {
  const { chatId } = req.body;
  if (!botService.bot) {
    return res.status(503).json({ error: 'Telegram bot is not available' });
  }
  botService.registerChatId(chatId);
  res.json({ success: true });
});

// Отправка уведомления
router.post('/notify', async (req, res) => {
  const { chatId, message } = req.body;
  if (!botService.bot) {
    return res.status(503).json({ error: 'Telegram bot is not available' });
  }
  try {
    await botService.sendMessage(chatId, message);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Обработка вебхука
router.post(`/webhook/:token`, (req, res) => {
  if (botService.bot) {
    botService.bot.handleUpdate(req.body);
  }
  res.sendStatus(200);
});

module.exports = router; 