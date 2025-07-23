const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './.env' });

// Конфигурация
const config = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://TAPDEL:fpz%25sE62KPzmHfM@cluster0.ejo8obw.mongodb.net/tapdel?retryWrites=true&w=majority&appName=Cluster0'
};

class UserDataRefresher {
  constructor() {
    this.db = null;
    this.results = {
      timestamp: new Date(),
      updated: [],
      errors: []
    };
  }

  async initialize() {
    console.log('🔧 Инициализация обновления данных пользователей...');
    
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

  async refreshUserData(userId) {
    console.log(`🔄 Обновление данных пользователя: ${userId}`);
    
    try {
      // Получаем пользователя
      const user = await this.db.collection('users').findOne({ userId });
      if (!user) {
        console.log(`❌ Пользователь ${userId} не найден`);
        return;
      }

      // Получаем все депозиты пользователя
      const deposits = await this.db.collection('deposits').find({
        userId: userId,
        matched: true
      }).toArray();

      // Получаем все выводы пользователя
      const withdrawals = await this.db.collection('withdrawals').find({
        userId: userId
      }).toArray();

      // Рассчитываем общий баланс
      let totalDeposits = 0;
      let totalWithdrawals = 0;

      // Суммируем подтвержденные депозиты
      for (const deposit of deposits) {
        if (deposit.confirmations >= 6) {
          totalDeposits += deposit.amountRequested;
        }
      }

      // Суммируем успешные выводы
      for (const withdrawal of withdrawals) {
        if (withdrawal.status === 'sent') {
          totalWithdrawals += withdrawal.amount;
        }
      }

      // Рассчитываем правильный баланс
      const correctBalance = totalDeposits - totalWithdrawals;
      const currentBalance = user.gameState?.tokens || 0;

      console.log(`📊 Баланс пользователя ${userId}:`);
      console.log(`   Текущий: ${currentBalance} DEL`);
      console.log(`   Правильный: ${correctBalance} DEL`);
      console.log(`   Депозиты: ${totalDeposits} DEL`);
      console.log(`   Выводы: ${totalWithdrawals} DEL`);

      // Обновляем баланс если он неверный
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

        console.log(`✅ Баланс обновлен: ${currentBalance} → ${correctBalance} DEL`);
        
        this.results.updated.push({
          userId: userId,
          oldBalance: currentBalance,
          newBalance: correctBalance,
          deposits: totalDeposits,
          withdrawals: totalWithdrawals
        });
      } else {
        console.log(`✅ Баланс корректный: ${currentBalance} DEL`);
      }

      // Обновляем статусы депозитов
      for (const deposit of deposits) {
        let newStatus = 'waiting';
        
        if (deposit.confirmations >= 6) {
          newStatus = 'confirmed';
        } else if (deposit.confirmations > 0) {
          newStatus = 'processing';
        }

        if (deposit.status !== newStatus) {
          await this.db.collection('deposits').updateOne(
            { _id: deposit._id },
            { $set: { status: newStatus } }
          );
          console.log(`📋 Статус депозита ${deposit._id}: ${deposit.status} → ${newStatus}`);
        }
      }

      // Обновляем статусы выводов
      for (const withdrawal of withdrawals) {
        let newStatus = withdrawal.status;
        
        // Если вывод в очереди больше 5 минут, помечаем как failed
        if (withdrawal.status === 'queued' && 
            new Date() - new Date(withdrawal.requestedAt) > 5 * 60 * 1000) {
          newStatus = 'failed';
          
          // Возвращаем средства пользователю
          await this.db.collection('users').updateOne(
            { userId },
            { $inc: { "gameState.tokens": withdrawal.amount } }
          );
          
          await this.db.collection('withdrawals').updateOne(
            { _id: withdrawal._id },
            {
              $set: {
                status: 'failed',
                error: 'Timeout - funds refunded',
                processedAt: new Date()
              }
            }
          );
          
          console.log(`💰 Вывод ${withdrawal._id} помечен как failed, средства возвращены`);
        }
      }

    } catch (error) {
      console.error(`❌ Ошибка обновления пользователя ${userId}:`, error);
      this.results.errors.push({
        userId: userId,
        error: error.message
      });
    }
  }

  async refreshAllUsers() {
    console.log('\n👥 Обновление всех пользователей...');
    
    try {
      const users = await this.db.collection('users').find({}).toArray();
      console.log(`📊 Найдено ${users.length} пользователей`);

      for (const user of users) {
        await this.refreshUserData(user.userId);
      }

      console.log('✅ Обновление всех пользователей завершено');
    } catch (error) {
      console.error('❌ Ошибка обновления пользователей:', error);
      this.results.errors.push({
        type: 'bulk_update',
        error: error.message
      });
    }
  }

  async generateSummary() {
    console.log('\n📋 Генерация сводки...');
    
    const summary = {
      totalUpdated: this.results.updated.length,
      totalErrors: this.results.errors.length,
      totalBalanceChange: 0
    };

    for (const update of this.results.updated) {
      summary.totalBalanceChange += (update.newBalance - update.oldBalance);
    }

    this.results.summary = summary;
    console.log('✅ Сводка сгенерирована');
  }

  async runRefresh() {
    console.log('🚀 Запуск обновления данных пользователей...\n');
    
    try {
      await this.initialize();
      
      // Обновляем конкретного пользователя
      await this.refreshUserData('telegram-297810833');
      
      // Обновляем всех пользователей
      await this.refreshAllUsers();
      
      await this.generateSummary();
      
      console.log('\n📊 Результаты обновления:');
      console.log(JSON.stringify(this.results, null, 2));
      
      // Сохранение результатов
      const refreshCollection = this.db.collection('data_refresh');
      await refreshCollection.insertOne({
        ...this.results,
        createdAt: new Date()
      });
      
      console.log('\n✅ Обновление данных завершено и сохранено в базе данных');
      
    } catch (error) {
      console.error('❌ Ошибка обновления данных:', error);
    } finally {
      process.exit(0);
    }
  }
}

// Запуск обновления данных
const refresher = new UserDataRefresher();
refresher.runRefresh(); 