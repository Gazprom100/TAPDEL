const { connectToDatabase } = require('../config/database');

class TokenBalanceService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 минут
  }

  // Сохранить баланс пользователя для конкретного токена
  async saveUserTokenBalance(userId, tokenSymbol, balance, highScore) {
    try {
      const database = await connectToDatabase();
      
      const balanceData = {
        userId,
        tokenSymbol,
        balance,
        highScore,
        lastUpdated: new Date(),
        isActive: false
      };

      // Обновляем или создаем запись
      await database.collection('user_token_balances').updateOne(
        { userId, tokenSymbol },
        { $set: balanceData },
        { upsert: true }
      );

      console.log(`💾 Сохранен баланс для пользователя ${userId}, токен ${tokenSymbol}: ${balance}`);
      return true;
    } catch (error) {
      console.error('Ошибка сохранения баланса токена:', error);
      return false;
    }
  }

  // Получить баланс пользователя для конкретного токена
  async getUserTokenBalance(userId, tokenSymbol) {
    try {
      const database = await connectToDatabase();
      
      const balance = await database.collection('user_token_balances').findOne({
        userId,
        tokenSymbol
      });

      return balance || {
        userId,
        tokenSymbol,
        balance: 0,
        highScore: 0,
        lastUpdated: new Date(),
        isActive: false
      };
    } catch (error) {
      console.error('Ошибка получения баланса токена:', error);
      return null;
    }
  }

  // Получить все балансы пользователя по токенам
  async getAllUserTokenBalances(userId) {
    try {
      const database = await connectToDatabase();
      
      const balances = await database.collection('user_token_balances')
        .find({ userId })
        .sort({ lastUpdated: -1 })
        .toArray();

      return balances;
    } catch (error) {
      console.error('Ошибка получения всех балансов токенов:', error);
      return [];
    }
  }

  // Миграция данных при смене активного токена
  async migrateToNewToken(oldTokenSymbol, newTokenSymbol) {
    try {
      const database = await connectToDatabase();
      
      console.log(`🔄 Начинаем миграцию с ${oldTokenSymbol} на ${newTokenSymbol}`);

      // Получаем всех пользователей
      const users = await database.collection('users').find({}).toArray();
      
      let migratedCount = 0;
      let errorCount = 0;

      for (const user of users) {
        try {
          // Сохраняем текущий баланс старого токена
          if (user.gameState && user.gameState.tokens !== undefined) {
            await this.saveUserTokenBalance(
              user.userId,
              oldTokenSymbol,
              user.gameState.tokens,
              user.gameState.highScore || 0
            );
          }

          // Проверяем, есть ли уже баланс для нового токена
          const existingBalance = await this.getUserTokenBalance(user.userId, newTokenSymbol);
          
          // Если есть существующий баланс, используем его, иначе 0
          const newBalance = existingBalance ? existingBalance.balance : 0;
          const newHighScore = existingBalance ? existingBalance.highScore : 0;
          
          // Обновляем игровое состояние с актуальным балансом
          const updatedGameState = {
            ...user.gameState,
            tokens: newBalance,
            highScore: newHighScore
          };

          // Обновляем пользователя
          await database.collection('users').updateOne(
            { userId: user.userId },
            { $set: { gameState: updatedGameState } }
          );

          // Создаем или обновляем запись для нового токена
          await this.saveUserTokenBalance(
            user.userId,
            newTokenSymbol,
            newBalance,
            newHighScore
          );

          // Помечаем новый токен как активный
          await database.collection('user_token_balances').updateOne(
            { userId: user.userId, tokenSymbol: newTokenSymbol },
            { $set: { isActive: true } }
          );

          // Помечаем старый токен как неактивный
          await database.collection('user_token_balances').updateOne(
            { userId: user.userId, tokenSymbol: oldTokenSymbol },
            { $set: { isActive: false } }
          );

          migratedCount++;
        } catch (error) {
          console.error(`Ошибка миграции пользователя ${user.userId}:`, error);
          errorCount++;
        }
      }

      console.log(`✅ Миграция завершена: ${migratedCount} пользователей, ошибок: ${errorCount}`);
      return { success: true, migratedCount, errorCount };
    } catch (error) {
      console.error('Ошибка миграции токенов:', error);
      return { success: false, error: error.message };
    }
  }

  // Получить статистику по токенам
  async getTokenStatistics() {
    try {
      const database = await connectToDatabase();
      
      const stats = await database.collection('user_token_balances').aggregate([
        {
          $group: {
            _id: '$tokenSymbol',
            totalUsers: { $sum: 1 },
            totalBalance: { $sum: '$balance' },
            totalHighScore: { $sum: '$highScore' },
            activeUsers: {
              $sum: { $cond: ['$isActive', 1, 0] }
            }
          }
        }
      ]).toArray();

      return stats;
    } catch (error) {
      console.error('Ошибка получения статистики токенов:', error);
      return [];
    }
  }

  // Очистить кеш
  clearCache() {
    this.cache.clear();
  }
}

module.exports = new TokenBalanceService(); 