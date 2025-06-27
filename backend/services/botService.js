const TelegramBot = require('node-telegram-bot-api');
const config = require('../config/telegram');

class BotService {
  constructor() {
    this.bot = null;
    this.userChatIds = new Map();
  }

  async initialize() {
    if (!config.token) {
      console.warn('TELEGRAM_BOT_TOKEN not provided. Bot functionality will be disabled.');
      return null;
    }

    try {
      this.bot = new TelegramBot(config.token, config.options);
      console.log('Telegram bot initialized successfully');

      if (config.isProduction) {
        await this.setupWebhook();
      }

      this.setupCommands();
      return this.bot;
    } catch (error) {
      console.error('Failed to initialize Telegram bot:', error);
      return null;
    }
  }

  async setupWebhook() {
    const webhookPath = `/webhook/${config.token}`;
    const webhookUrl = `${config.url}${webhookPath}`;

    try {
      await this.bot.deleteWebHook();
      console.log('Old webhook removed');
      await this.bot.setWebHook(webhookUrl);
      console.log('Webhook set successfully:', webhookUrl);
    } catch (error) {
      console.error('Failed to set webhook:', error);
    }
  }

  setupCommands() {
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      this.userChatIds.set(chatId, true);
      this.bot.sendMessage(chatId, 'Привет! Я бот игры TAPDEL. Ваш ID чата: ' + chatId);
    });
  }

  async sendMessage(chatId, message) {
    if (!this.bot) {
      throw new Error('Bot is not initialized');
    }
    return this.bot.sendMessage(chatId, message);
  }

  registerChatId(chatId) {
    this.userChatIds.set(chatId, true);
  }

  async shutdown() {
    if (!this.bot) return;

    if (config.isProduction) {
      try {
        await this.bot.deleteWebHook();
        console.log('Webhook removed');
      } catch (error) {
        console.error('Error removing webhook:', error);
      }
    } else {
      try {
        await this.bot.stopPolling();
        console.log('Bot polling stopped');
      } catch (error) {
        console.error('Error stopping bot:', error);
      }
    }
  }
}

module.exports = new BotService(); 