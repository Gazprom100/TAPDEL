import TelegramBot from 'node-telegram-bot-api';

let bot: TelegramBot | null = null;

const API_URL = import.meta.env.MODE === 'production'
  ? '/api/telegram' 
  : 'http://localhost:3000/api/telegram';

// Получение токена из переменных окружения
export const getTelegramToken = (): string => {
  const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('Токен Telegram бота не найден в переменных окружения');
  }
  return token;
};

// Инициализация бота
export const initializeTelegramBot = async () => {
  try {
    // Здесь можно добавить логику инициализации, если нужно
    console.log('Telegram интеграция инициализирована');
  } catch (error) {
    console.error('Ошибка инициализации Telegram:', error);
  }
};

export const registerTelegramChat = async (chatId: number) => {
  try {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chatId }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to register chat');
    }
    return data;
  } catch (error) {
    console.error('Ошибка регистрации чата:', error);
    return { success: false, error };
  }
};

// Отправка сообщения
export const sendTelegramMessage = async (chatId: number, message: string) => {
  try {
    const response = await fetch(`${API_URL}/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chatId, message }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to send message');
    }
    return data;
  } catch (error) {
    console.error('Ошибка отправки сообщения:', error);
    return { success: false, error };
  }
};

// Отправка уведомления о достижении
export const sendAchievementNotification = async (chatId: number, achievement: string) => {
  const message = `🎉 Поздравляем! Вы получили достижение: ${achievement}`;
  return sendTelegramMessage(chatId, message);
};

// Отправка уведомления о новом рекорде
export const sendNewRecordNotification = async (chatId: number, score: number) => {
  const message = `🏆 Новый рекорд! Ваш результат: ${score} токенов`;
  return sendTelegramMessage(chatId, message);
}; 