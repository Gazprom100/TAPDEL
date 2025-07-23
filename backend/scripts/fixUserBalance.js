const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './.env' });

// Конфигурация
const config = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://TAPDEL:fpz%25sE62KPzmHfM@cluster0.ejo8obw.mongodb.net/tapdel?retryWrites=true&w=majority&appName=Cluster0'
};

class BalanceFixer {
  constructor() {
    this.db = null;
  }

  async initialize() {
    console.log('🔧 Инициализация исправления баланса...');
    
    try {
      const client = new MongoClient(config.MONGODB_URI);
      await client.connect();
      this.db = client.db('tapdel');
      console.log('✅ MongoDB подключен');
    } catch (error) {
      console.error('❌ Ошибка инициализации:', error);
      throw error;
    }
  }

  async fixUserBalance(userId) {
    console.log(`🔄 Исправление баланса пользователя: ${userId}`);
    
    try {
      // Получаем пользователя
      const user = await this.db.collection('users').findOne({ userId });
      if (!user) {
        console.log(`❌ Пользователь ${userId} не найден`);
        return;
      }

      // Получаем все депозиты пользователя
      const deposits = await this.db.collection('deposits').find({
        userId: userId
      }).toArray();

      // Получаем все выводы пользователя
      const withdrawals = await this.db.collection('withdrawals').find({
        userId: userId
      }).toArray();

      console.log(`📊 Анализ транзакций для ${userId}:`);
      console.log(`   Депозитов: ${deposits.length}`);
      console.log(`   Выводов: ${withdrawals.length}`);

      // Анализируем депозиты
      let totalDeposits = 0;
      let confirmedDeposits = 0;
      
      for (const deposit of deposits) {
        console.log(`   Депозит: ${deposit.amountRequested} DEL, статус: ${deposit.status}, подтверждения: ${deposit.confirmations}`);
        
        if (deposit.matched && deposit.confirmations >= 6) {
          totalDeposits += deposit.amountRequested;
          confirmedDeposits++;
        }
      }

      // Анализируем выводы
      let totalWithdrawals = 0;
      let successfulWithdrawals = 0;
      let refundedWithdrawals = 0;
      
      for (const withdrawal of withdrawals) {
        console.log(`   Вывод: ${withdrawal.amount} DEL, статус: ${withdrawal.status}`);
        
        if (withdrawal.status === 'sent') {
          totalWithdrawals += withdrawal.amount;
          successfulWithdrawals++;
        } else if (withdrawal.status === 'refunded') {
          refundedWithdrawals++;
        }
      }

      console.log(`\n📋 Сводка по ${userId}:`);
      console.log(`   Подтвержденных депозитов: ${confirmedDeposits} (${totalDeposits} DEL)`);
      console.log(`   Успешных выводов: ${successfulWithdrawals} (${totalWithdrawals} DEL)`);
      console.log(`   Возвращенных выводов: ${refundedWithdrawals}`);

      // Рассчитываем правильный баланс
      const correctBalance = totalDeposits - totalWithdrawals;
      const currentBalance = user.gameState?.tokens || 0;

      console.log(`\n💰 Баланс:`);
      console.log(`   Текущий: ${currentBalance} DEL`);
      console.log(`   Правильный: ${correctBalance} DEL`);
      console.log(`   Разница: ${correctBalance - currentBalance} DEL`);

      // Обновляем баланс
      if (Math.abs(currentBalance - correctBalance) > 0.01) {
        await this.db.collection('users').updateOne(
          { userId },
          {
            $set: {
              "gameState.tokens": correctBalance,
              "gameState.lastSaved": new Date(),
              updatedAt: new Date()
            }
          }
        );

        console.log(`✅ Баланс исправлен: ${currentBalance} → ${correctBalance} DEL`);
        
        return {
          userId: userId,
          oldBalance: currentBalance,
          newBalance: correctBalance,
          deposits: totalDeposits,
          withdrawals: totalWithdrawals,
          confirmedDeposits: confirmedDeposits,
          successfulWithdrawals: successfulWithdrawals,
          refundedWithdrawals: refundedWithdrawals
        };
      } else {
        console.log(`✅ Баланс уже корректен: ${currentBalance} DEL`);
        return null;
      }

    } catch (error) {
      console.error(`❌ Ошибка исправления баланса для ${userId}:`, error);
      throw error;
    }
  }

  async runFix() {
    console.log('🚀 Запуск исправления баланса...\n');
    
    try {
      await this.initialize();
      
      // Исправляем баланс конкретного пользователя
      const result = await this.fixUserBalance('telegram-297810833');
      
      if (result) {
        console.log('\n📊 Результат исправления:');
        console.log(JSON.stringify(result, null, 2));
      }
      
      console.log('\n✅ Исправление баланса завершено');
      
    } catch (error) {
      console.error('❌ Ошибка исправления баланса:', error);
    } finally {
      process.exit(0);
    }
  }
}

// Запуск исправления баланса
const fixer = new BalanceFixer();
fixer.runFix(); 