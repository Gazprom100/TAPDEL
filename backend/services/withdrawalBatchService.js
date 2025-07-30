const databaseConfig = require('../config/database');
const decimalService = require('./decimalService');

class WithdrawalBatchService {
  constructor() {
    this.batchSize = 10;
    this.processingInterval = 30000; // 30 секунд
    this.maxRetries = 3;
    this.isProcessing = false;
    this.stats = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      averageProcessingTime: 0
    };
  }

  async initialize() {
    console.log('🔄 Инициализация WithdrawalBatchService...');
    
    // Запускаем batch processing
    this.startBatchProcessing();
    
    console.log(`✅ WithdrawalBatchService инициализирован`);
    console.log(`   - Batch size: ${this.batchSize}`);
    console.log(`   - Processing interval: ${this.processingInterval}ms`);
    console.log(`   - Max retries: ${this.maxRetries}`);
  }

  async startBatchProcessing() {
    setInterval(async () => {
      if (!this.isProcessing) {
        await this.processBatch();
      }
    }, this.processingInterval);
  }

  async processBatch() {
    if (this.isProcessing) {
      console.log('⚠️ Batch processing уже выполняется, пропускаем...');
      return;
    }

    this.isProcessing = true;
    const startTime = Date.now();

    try {
      console.log('🔄 Начинаем обработку batch выводов...');
      
      const database = await databaseConfig.connect();
      if (!database) {
        throw new Error('База данных недоступна');
      }

      // Получаем pending выводы
      const pendingWithdrawals = await this.getPendingWithdrawals(database);
      
      if (pendingWithdrawals.length === 0) {
        console.log('💤 Нет pending выводов для обработки');
        this.isProcessing = false;
        return;
      }

      console.log(`📦 Обрабатываем batch из ${pendingWithdrawals.length} выводов`);

      // Обрабатываем выводы параллельно
      const results = await Promise.allSettled(
        pendingWithdrawals.map(withdrawal => this.processWithdrawal(withdrawal))
      );

      // Анализируем результаты
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      // Обновляем статистику
      this.stats.totalProcessed += pendingWithdrawals.length;
      this.stats.successful += successful;
      this.stats.failed += failed;
      this.stats.averageProcessingTime = (Date.now() - startTime) / pendingWithdrawals.length;

      console.log(`✅ Batch завершен:`);
      console.log(`   - Успешно: ${successful}`);
      console.log(`   - Неудачно: ${failed}`);
      console.log(`   - Время обработки: ${Date.now() - startTime}ms`);

      // Логируем ошибки
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`❌ Ошибка вывода ${pendingWithdrawals[index]._id}:`, result.reason);
        }
      });

    } catch (error) {
      console.error('❌ Ошибка batch processing:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  async getPendingWithdrawals(database) {
    try {
      // Получаем выводы в статусе processing или queued
      const withdrawals = await database.collection('withdrawals').find({
        status: { $in: ['processing', 'queued'] },
        $or: [
          { processingStartedAt: { $exists: false } },
          { processingStartedAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) } } // 5 минут
        ]
      }).limit(this.batchSize).toArray();

      return withdrawals;
    } catch (error) {
      console.error('❌ Ошибка получения pending выводов:', error);
      return [];
    }
  }

  async processWithdrawal(withdrawal) {
    const database = await databaseConfig.connect();
    
    try {
      console.log(`🔄 Обрабатываем вывод: ${withdrawal._id} (${withdrawal.amount} DEL)`);

      // Обновляем статус на processing
      await database.collection('withdrawals').updateOne(
        { _id: withdrawal._id },
        { 
          $set: { 
            status: 'processing',
            processingStartedAt: new Date(),
            retryCount: (withdrawal.retryCount || 0) + 1
          }
        }
      );

      // Проверяем баланс рабочего кошелька
      const workingBalance = await decimalService.getWorkingBalance();
      if (workingBalance < withdrawal.amount) {
        throw new Error(`Недостаточно средств в рабочем кошельке: ${workingBalance} < ${withdrawal.amount}`);
      }

      // Отправляем транзакцию
      const txHash = await decimalService.sendWithdrawal(
        withdrawal.userId,
        withdrawal.amount,
        withdrawal.toAddress
      );

      // Обновляем статус на completed
      await database.collection('withdrawals').updateOne(
        { _id: withdrawal._id },
        { 
          $set: { 
            status: 'completed',
            txHash: txHash,
            completedAt: new Date()
          }
        }
      );

      console.log(`✅ Вывод ${withdrawal._id} успешно обработан: ${txHash}`);

      // Обновляем баланс пользователя
      await database.collection('users').updateOne(
        { userId: withdrawal.userId },
        { 
          $inc: { "gameState.tokens": -withdrawal.amount },
          $set: { updatedAt: new Date() }
        }
      );

      return { success: true, txHash };

    } catch (error) {
      console.error(`❌ Ошибка обработки вывода ${withdrawal._id}:`, error.message);

      // Проверяем количество попыток
      const retryCount = (withdrawal.retryCount || 0) + 1;
      
      if (retryCount >= this.maxRetries) {
        // Помечаем как failed
        await database.collection('withdrawals').updateOne(
          { _id: withdrawal._id },
          { 
            $set: { 
              status: 'failed',
              error: error.message,
              failedAt: new Date()
            }
          }
        );

        // Возвращаем средства пользователю
        await database.collection('users').updateOne(
          { userId: withdrawal.userId },
          { 
            $inc: { "gameState.tokens": withdrawal.amount },
            $set: { updatedAt: new Date() }
          }
        );

        console.log(`💸 Возвращены средства пользователю ${withdrawal.userId}: ${withdrawal.amount} DEL`);
      } else {
        // Возвращаем в очередь для повторной попытки
        await database.collection('withdrawals').updateOne(
          { _id: withdrawal._id },
          { 
            $set: { 
              status: 'queued',
              processingStartedAt: null,
              error: error.message
            }
          }
        );
      }

      throw error;
    }
  }

  // Ручная обработка конкретного вывода
  async processSpecificWithdrawal(withdrawalId) {
    const database = await databaseConfig.connect();
    const withdrawal = await database.collection('withdrawals').findOne({ _id: withdrawalId });
    
    if (!withdrawal) {
      throw new Error('Вывод не найден');
    }

    return await this.processWithdrawal(withdrawal);
  }

  // Получение статистики
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalProcessed > 0 
        ? ((this.stats.successful / this.stats.totalProcessed) * 100).toFixed(2) + '%'
        : '0%',
      isProcessing: this.isProcessing
    };
  }

  // Очистка старых записей
  async cleanupOldRecords() {
    try {
      const database = await databaseConfig.connect();
      
      // Удаляем записи старше 30 дней
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const result = await database.collection('withdrawals').deleteMany({
        createdAt: { $lt: thirtyDaysAgo },
        status: { $in: ['completed', 'failed'] }
      });

      console.log(`🗑️ Очищено ${result.deletedCount} старых записей выводов`);
      
      return result.deletedCount;
    } catch (error) {
      console.error('❌ Ошибка очистки старых записей:', error);
      return 0;
    }
  }

  // Graceful shutdown
  async shutdown() {
    console.log('🔌 WithdrawalBatchService: Завершение работы...');
    this.isProcessing = false;
  }
}

// Создаем singleton instance
const withdrawalBatchService = new WithdrawalBatchService();

module.exports = withdrawalBatchService; 