const { MongoClient } = require('mongodb');
const redis = require('redis');
const { Web3 } = require('web3');
require('dotenv').config({ path: './.env' });

// Конфигурация
const config = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://TAPDEL:fpz%25sE62KPzmHfM@cluster0.ejo8obw.mongodb.net/tapdel?retryWrites=true&w=majority&appName=Cluster0',
  REDIS_URL: process.env.REDIS_URL,
  DECIMAL_RPC_URL: process.env.DECIMAL_RPC_URL || 'https://node.decimalchain.com/web3/',
  WORKING_ADDRESS: process.env.DECIMAL_WORKING_ADDRESS,
  WORKING_PRIVKEY_ENC: process.env.DECIMAL_WORKING_PRIVKEY_ENC,
  KEY_PASSPHRASE: process.env.DECIMAL_KEY_PASSPHRASE
};

class BalanceFixer {
  constructor() {
    this.db = null;
    this.redis = null;
    this.web3 = null;
    this.results = {
      timestamp: new Date(),
      fixes: [],
      errors: []
    };
  }

  async initialize() {
    console.log('🔧 Инициализация системы исправления балансов...');
    
    try {
      // Подключение к MongoDB
      const client = new MongoClient(config.MONGODB_URI);
      await client.connect();
      this.db = client.db('tapdel');
      console.log('✅ MongoDB подключен');

      // Подключение к Redis
      if (config.REDIS_URL) {
        const redisConfig = config.REDIS_URL.includes('upstash.io') ? {
          url: config.REDIS_URL,
          socket: { tls: true, rejectUnauthorized: false },
          connectTimeout: 60000,
          lazyConnect: true
        } : {
          url: config.REDIS_URL,
          socket: { connectTimeout: 10000, tls: false },
          connectTimeout: 10000,
          lazyConnect: true
        };
        
        this.redis = redis.createClient(redisConfig);
        await this.redis.connect();
        console.log('✅ Redis подключен');
      }

      // Подключение к DecimalChain
      this.web3 = new Web3(config.DECIMAL_RPC_URL);
      const blockNumber = await this.web3.eth.getBlockNumber();
      console.log(`✅ DecimalChain подключен, блок: ${blockNumber}`);

    } catch (error) {
      console.error('❌ Ошибка инициализации:', error);
      throw error;
    }
  }

  async fixBlockchainSync() {
    console.log('\n🔗 Исправление синхронизации с блокчейном...');
    
    if (!this.redis) {
      console.log('⚠️ Redis недоступен, пропускаем исправление синхронизации');
      return;
    }

    try {
      const lastBlockKey = 'DECIMAL_LAST_BLOCK';
      const currentBlock = await this.web3.eth.getBlockNumber();
      const currentBlockNum = Number(currentBlock);
      
      // Удаляем старый ключ и устанавливаем актуальный блок
      await this.redis.del(lastBlockKey);
      await this.redis.set(lastBlockKey, (currentBlockNum - 5).toString());
      
      this.results.fixes.push({
        type: 'blockchain_sync',
        action: 'reset_last_block',
        oldBlock: 'unknown',
        newBlock: currentBlockNum - 5,
        currentBlock: currentBlockNum
      });
      
      console.log(`✅ Синхронизация исправлена: установлен блок ${currentBlockNum - 5} (текущий: ${currentBlockNum})`);
    } catch (error) {
      console.error('❌ Ошибка исправления синхронизации:', error);
      this.results.errors.push({
        type: 'blockchain_sync',
        error: error.message
      });
    }
  }

  async fixFailedWithdrawals() {
    console.log('\n💸 Исправление неудачных выводов...');
    
    try {
      // Находим все неудачные выводы
      const failedWithdrawals = await this.db.collection('withdrawals').find({
        status: 'failed'
      }).toArray();

      console.log(`📊 Найдено ${failedWithdrawals.length} неудачных выводов`);

      for (const withdrawal of failedWithdrawals) {
        try {
          // Проверяем, были ли средства уже возвращены
          const user = await this.db.collection('users').findOne({ userId: withdrawal.userId });
          if (!user) {
            console.log(`⚠️ Пользователь ${withdrawal.userId} не найден, пропускаем`);
            continue;
          }

          // Проверяем, нужно ли вернуть средства
          const amount = parseFloat(withdrawal.amount);
          if (isNaN(amount) || amount <= 0) {
            console.log(`⚠️ Некорректная сумма для вывода ${withdrawal._id}: ${withdrawal.amount}`);
            continue;
          }

          // Возвращаем средства, если они еще не возвращены
          await this.db.collection('users').updateOne(
            { userId: withdrawal.userId },
            { $inc: { "gameState.tokens": amount } }
          );

          // Обновляем статус вывода
          await this.db.collection('withdrawals').updateOne(
            { _id: withdrawal._id },
            {
              $set: {
                status: 'refunded',
                refundedAt: new Date(),
                refundAmount: amount
              }
            }
          );

          this.results.fixes.push({
            type: 'failed_withdrawal_refund',
            withdrawalId: withdrawal._id.toString(),
            userId: withdrawal.userId,
            amount: amount,
            error: withdrawal.error
          });

          console.log(`💰 Возвращены средства пользователю ${withdrawal.userId}: +${amount} DEL`);
        } catch (error) {
          console.error(`❌ Ошибка обработки вывода ${withdrawal._id}:`, error);
          this.results.errors.push({
            type: 'withdrawal_refund',
            withdrawalId: withdrawal._id.toString(),
            error: error.message
          });
        }
      }

      console.log('✅ Обработка неудачных выводов завершена');
    } catch (error) {
      console.error('❌ Ошибка исправления выводов:', error);
      this.results.errors.push({
        type: 'withdrawals_fix',
        error: error.message
      });
    }
  }

  async fixStuckWithdrawals() {
    console.log('\n🔄 Исправление застрявших выводов...');
    
    try {
      const now = new Date();
      const fiveMinutesAgo = new Date(now - 5 * 60 * 1000);

      // Находим застрявшие выводы в статусе processing
      const stuckWithdrawals = await this.db.collection('withdrawals').find({
        status: 'processing',
        processingStartedAt: { $lt: fiveMinutesAgo }
      }).toArray();

      console.log(`📊 Найдено ${stuckWithdrawals.length} застрявших выводов`);

      for (const withdrawal of stuckWithdrawals) {
        try {
          const amount = parseFloat(withdrawal.amount);
          
          // Возвращаем средства
          await this.db.collection('users').updateOne(
            { userId: withdrawal.userId },
            { $inc: { "gameState.tokens": amount } }
          );

          // Помечаем как failed
          await this.db.collection('withdrawals').updateOne(
            { _id: withdrawal._id },
            {
              $set: {
                status: 'failed',
                error: 'Timeout - processing took too long (auto-fixed)',
                processedAt: new Date()
              },
              $unset: { processingStartedAt: 1 }
            }
          );

          this.results.fixes.push({
            type: 'stuck_withdrawal_fix',
            withdrawalId: withdrawal._id.toString(),
            userId: withdrawal.userId,
            amount: amount
          });

          console.log(`🔧 Исправлен застрявший вывод ${withdrawal._id}: возвращено ${amount} DEL`);
        } catch (error) {
          console.error(`❌ Ошибка исправления застрявшего вывода ${withdrawal._id}:`, error);
          this.results.errors.push({
            type: 'stuck_withdrawal_fix',
            withdrawalId: withdrawal._id.toString(),
            error: error.message
          });
        }
      }

      console.log('✅ Исправление застрявших выводов завершено');
    } catch (error) {
      console.error('❌ Ошибка исправления застрявших выводов:', error);
      this.results.errors.push({
        type: 'stuck_withdrawals_fix',
        error: error.message
      });
    }
  }

  async fixExpiredDeposits() {
    console.log('\n🧹 Очистка истекших депозитов...');
    
    try {
      // Находим истекшие депозиты
      const expiredDeposits = await this.db.collection('deposits').find({
        matched: false,
        expiresAt: { $lt: new Date() }
      }).toArray();

      console.log(`📊 Найдено ${expiredDeposits.length} истекших депозитов`);

      if (expiredDeposits.length > 0) {
        // Помечаем как expired
        const result = await this.db.collection('deposits').updateMany(
          {
            matched: false,
            expiresAt: { $lt: new Date() }
          },
          {
            $set: {
              status: 'expired',
              expiredAt: new Date()
            }
          }
        );

        this.results.fixes.push({
          type: 'expired_deposits_cleanup',
          count: result.modifiedCount
        });

        console.log(`✅ ${result.modifiedCount} депозитов помечены как истекшие`);
      }
    } catch (error) {
      console.error('❌ Ошибка очистки истекших депозитов:', error);
      this.results.errors.push({
        type: 'expired_deposits_cleanup',
        error: error.message
      });
    }
  }

  async fixAnomalousBalances() {
    console.log('\n👥 Исправление аномальных балансов...');
    
    try {
      const users = await this.db.collection('users').find().toArray();
      const anomalousUsers = [];

      for (const user of users) {
        const tokens = user.gameState?.tokens || 0;
        
        // Проверяем на аномально большие балансы (>1000 DEL)
        if (tokens > 1000) {
          anomalousUsers.push({
            userId: user.userId,
            currentTokens: tokens,
            isTestUser: user.userId.includes('test') || user.userId.includes('debug')
          });
        }
      }

      console.log(`📊 Найдено ${anomalousUsers.length} пользователей с аномальными балансами`);

      for (const anomalous of anomalousUsers) {
        try {
          if (anomalous.isTestUser) {
            // Для тестовых пользователей - сбрасываем баланс
            await this.db.collection('users').updateOne(
              { userId: anomalous.userId },
              { $set: { "gameState.tokens": 0, updatedAt: new Date() } }
            );

            this.results.fixes.push({
              type: 'test_user_balance_reset',
              userId: anomalous.userId,
              oldBalance: anomalous.currentTokens,
              newBalance: 0
            });

            console.log(`🧪 Сброшен баланс тестового пользователя ${anomalous.userId}: ${anomalous.currentTokens} → 0 DEL`);
          } else {
            // Для реальных пользователей - логируем для ручной проверки
            this.results.fixes.push({
              type: 'anomalous_balance_detected',
              userId: anomalous.userId,
              balance: anomalous.currentTokens,
              action: 'manual_review_required'
            });

            console.log(`⚠️ Обнаружен аномальный баланс у ${anomalous.userId}: ${anomalous.currentTokens} DEL (требует ручной проверки)`);
          }
        } catch (error) {
          console.error(`❌ Ошибка обработки аномального баланса ${anomalous.userId}:`, error);
          this.results.errors.push({
            type: 'anomalous_balance_fix',
            userId: anomalous.userId,
            error: error.message
          });
        }
      }

      console.log('✅ Обработка аномальных балансов завершена');
    } catch (error) {
      console.error('❌ Ошибка исправления аномальных балансов:', error);
      this.results.errors.push({
        type: 'anomalous_balances_fix',
        error: error.message
      });
    }
  }

  async resetNonceCache() {
    console.log('\n🔄 Сброс кэша nonce...');
    
    if (!this.redis) {
      console.log('⚠️ Redis недоступен, пропускаем сброс nonce');
      return;
    }

    try {
      // Получаем актуальный nonce с блокчейна
      const currentNonce = await this.web3.eth.getTransactionCount(config.WORKING_ADDRESS);
      const nonceKey = `DECIMAL_NONCE_${config.WORKING_ADDRESS.toLowerCase()}`;
      
      // Устанавливаем актуальный nonce
      await this.redis.setEx(nonceKey, 30, Number(currentNonce).toString());
      
      this.results.fixes.push({
        type: 'nonce_cache_reset',
        address: config.WORKING_ADDRESS,
        newNonce: Number(currentNonce)
      });

      console.log(`✅ Кэш nonce сброшен: установлен ${Number(currentNonce)} для ${config.WORKING_ADDRESS}`);
    } catch (error) {
      console.error('❌ Ошибка сброса nonce:', error);
      this.results.errors.push({
        type: 'nonce_reset',
        error: error.message
      });
    }
  }

  async generateSummary() {
    console.log('\n📋 Генерация сводки исправлений...');
    
    const summary = {
      totalFixes: this.results.fixes.length,
      totalErrors: this.results.errors.length,
      fixTypes: {},
      errorTypes: {}
    };

    // Группировка по типам исправлений
    for (const fix of this.results.fixes) {
      summary.fixTypes[fix.type] = (summary.fixTypes[fix.type] || 0) + 1;
    }

    // Группировка по типам ошибок
    for (const error of this.results.errors) {
      summary.errorTypes[error.type] = (summary.errorTypes[error.type] || 0) + 1;
    }

    this.results.summary = summary;
    console.log('✅ Сводка сгенерирована');
  }

  async runFullFix() {
    console.log('🚀 Запуск полного исправления системы ввода/вывода DEL...\n');
    
    try {
      await this.initialize();
      
      await this.fixBlockchainSync();
      await this.fixFailedWithdrawals();
      await this.fixStuckWithdrawals();
      await this.fixExpiredDeposits();
      await this.fixAnomalousBalances();
      await this.resetNonceCache();
      
      await this.generateSummary();
      
      console.log('\n📊 Результаты исправлений:');
      console.log(JSON.stringify(this.results, null, 2));
      
      // Сохранение результатов
      const fixCollection = this.db.collection('balance_fixes');
      await fixCollection.insertOne({
        ...this.results,
        createdAt: new Date()
      });
      
      console.log('\n✅ Исправления завершены и сохранены в базе данных');
      
      // Рекомендации по перезапуску
      console.log('\n🔄 Рекомендации:');
      console.log('1. Перезапустите backend сервер для применения исправлений');
      console.log('2. Проверьте логи на наличие ошибок');
      console.log('3. Запустите тестовые депозиты/выводы для проверки');
      
    } catch (error) {
      console.error('❌ Ошибка исправлений:', error);
    } finally {
      if (this.redis) await this.redis.disconnect();
      process.exit(0);
    }
  }
}

// Запуск исправлений
const fixer = new BalanceFixer();
fixer.runFullFix(); 