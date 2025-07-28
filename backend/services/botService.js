const TelegramBot = require('node-telegram-bot-api');
const config = require('../config/telegram');

class BotService {
  constructor() {
    this.bot = null;
    this.userChatIds = new Map();
    this.database = null; // Добавляем подключение к БД
  }

  // Добавляем метод для подключения к БД
  setDatabase(database) {
    this.database = database;
    console.log('✅ BotService: База данных подключена');
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
    // Обработчик команды /start с автосохранением пользователя
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const user = msg.from;
      
      this.userChatIds.set(chatId, true);
      
      console.log('👤 Новый пользователь:', {
        id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        chatId: chatId
      });

      // АВТОМАТИЧЕСКОЕ СОХРАНЕНИЕ ПОЛЬЗОВАТЕЛЯ В БД
      await this.saveUserToDatabase(user, chatId);
      
      const welcomeMessage = `🎮 Добро пожаловать в TAPDEL!

🚀 Tap-to-Earn игра на блокчейне DecimalChain
💎 Зарабатывайте BOOST токены простыми тапами
🏆 Соревнуйтесь в рейтинге с другими игроками

Ваш Telegram ID: ${user.id}
Chat ID: ${chatId}

Нажмите кнопку ниже, чтобы начать игру! 👇`;

      // Отправляем приветствие с кнопкой запуска WebApp
      const options = {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🎮 Играть TAPDEL',
                web_app: {
                  url: config.url
                }
              }
            ]
          ]
        }
      };

      await this.bot.sendMessage(chatId, welcomeMessage, options);
      console.log(`✅ Приветствие отправлено пользователю ${user.id}`);
    });

    // Обработчик всех сообщений для отслеживания активности
    this.bot.on('message', async (msg) => {
      if (msg.text === '/start') return; // Уже обработано выше

      const user = msg.from;
      const chatId = msg.chat.id;

      // Обновляем данные пользователя при любом сообщении
      await this.updateUserActivity(user, chatId);
    });

    // Обработчик callback запросов (например, нажатия на inline кнопки)
    this.bot.on('callback_query', async (callbackQuery) => {
      const user = callbackQuery.from;
      const chatId = callbackQuery.message.chat.id;

      // Обновляем активность
      await this.updateUserActivity(user, chatId);
    });
  }

  // Новый метод: Сохранение пользователя в БД
  async saveUserToDatabase(telegramUser, chatId) {
    if (!this.database) {
      console.warn('⚠️ База данных не подключена к боту');
      return;
    }

    try {
      const userId = `telegram-${telegramUser.id}`;
      
      // Создаем полный профиль пользователя
      const userProfile = {
        userId: userId,
        username: `${telegramUser.first_name} ${telegramUser.last_name || ''}`.trim(),
        maxEnergy: 100,
        energyRecoveryRate: 1,
        maxGear: 'M',
        level: 1,
        experience: 0,
        createdAt: new Date(),
        lastLogin: new Date(),
        telegramId: telegramUser.id.toString(),
        telegramUsername: telegramUser.username,
        telegramFirstName: telegramUser.first_name,
        telegramLastName: telegramUser.last_name,
        chatId: chatId
      };

      // Сохраняем/обновляем пользователя
      const result = await this.database.collection('users').updateOne(
        { userId: userId },
        {
          $set: {
            profile: userProfile,
            gameState: {
              tokens: 0,
              highScore: 0,
              engineLevel: 'Mk I',
              gearboxLevel: 'L1',
              batteryLevel: 'B1',
              hyperdriveLevel: 'H1',
              powerGridLevel: 'P1',
              lastSaved: new Date()
            },
            gameBalance: 0,
            transactions: [],
            updatedAt: new Date(),
            botInteraction: {
              firstInteraction: new Date(),
              lastSeen: new Date(),
              chatId: chatId
            }
          }
        },
        { upsert: true }
      );

      // Добавляем в лидерборд
      await this.database.collection('leaderboard').updateOne(
        { userId: userId },
        {
          $set: {
            userId: userId,
            username: userProfile.username,
            telegramId: telegramUser.id.toString(),
            telegramUsername: telegramUser.username,
            telegramFirstName: telegramUser.first_name,
            telegramLastName: telegramUser.last_name,
            tokens: 0,
            rank: 1,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );

      // Обновляем ранги
      await this.updateAllRanks();

      console.log(`✅ Пользователь ${userId} ${result.upsertedCount ? 'создан' : 'обновлен'} в БД`);

    } catch (error) {
      console.error('❌ Ошибка сохранения пользователя в БД:', error);
    }
  }

  // Новый метод: Обновление активности пользователя
  async updateUserActivity(telegramUser, chatId) {
    if (!this.database) return;

    try {
      const userId = `telegram-${telegramUser.id}`;

      await this.database.collection('users').updateOne(
        { userId: userId },
        {
          $set: {
            'botInteraction.lastSeen': new Date(),
            'botInteraction.chatId': chatId,
            updatedAt: new Date()
          }
        }
      );

      console.log(`🔄 Обновлена активность пользователя ${userId}`);
    } catch (error) {
      console.error('❌ Ошибка обновления активности:', error);
    }
  }

  // Новый метод: Обновление рангов в лидерборде
  async updateAllRanks() {
    if (!this.database) return;

    try {
      const users = await this.database.collection('leaderboard')
        .find()
        .sort({ tokens: -1 })
        .toArray();
      
      await Promise.all(users.map((user, index) => 
        this.database.collection('leaderboard').updateOne(
          { _id: user._id },
          { $set: { rank: index + 1 } }
        )
      ));
    } catch (error) {
      console.error('❌ Ошибка обновления рангов:', error);
    }
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