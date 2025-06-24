import TelegramBot from 'node-telegram-bot-api';

let bot: TelegramBot | null = null;

// Получение токена из переменных окружения
export const getTelegramToken = (): string => {
  const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('Токен Telegram бота не найден в переменных окружения');
  }
  return token;
};

// Инициализация бота
export const initializeTelegramBot = () => {
  try {
    const token = getTelegramToken();
    bot = new TelegramBot(token, { polling: true });
    
    // Обработка команды /start
    bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      bot?.sendMessage(chatId, 'Привет! Я бот игры TAPDEL. Чем могу помочь?');
    });

    // Обработка команды /help
    bot.onText(/\/help/, (msg) => {
      const chatId = msg.chat.id;
      bot?.sendMessage(chatId, `
Доступные команды:
/start - Начать взаимодействие
/help - Показать это сообщение
/stats - Показать вашу статистику
      `);
    });

    console.log('Telegram бот успешно инициализирован');
  } catch (error) {
    console.error('Ошибка инициализации Telegram бота:', error);
  }
};

// Отправка сообщения
export const sendTelegramMessage = (chatId: number, message: string) => {
  if (!bot) {
    console.error('Бот не инициализирован');
    return;
  }
  
  try {
    return bot.sendMessage(chatId, message);
  } catch (error) {
    console.error('Ошибка отправки сообщения:', error);
  }
};

// Отправка уведомления о достижении
export const sendAchievementNotification = (chatId: number, achievement: string) => {
  const message = `🎉 Поздравляем! Вы получили достижение: ${achievement}`;
  return sendTelegramMessage(chatId, message);
};

// Отправка уведомления о новом рекорде
export const sendNewRecordNotification = (chatId: number, score: number) => {
  const message = `🏆 Новый рекорд! Ваш результат: ${score} токенов`;
  return sendTelegramMessage(chatId, message);
}; 