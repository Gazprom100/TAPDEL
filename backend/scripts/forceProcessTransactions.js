const { MongoClient } = require('mongodb');
const { Web3 } = require('web3');
require('dotenv').config({ path: './.env' });

// Конфигурация
const config = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://TAPDEL:fpz%25sE62KPzmHfM@cluster0.ejo8obw.mongodb.net/tapdel?retryWrites=true&w=majority&appName=Cluster0',
  DECIMAL_RPC_URL: process.env.DECIMAL_RPC_URL || 'https://node.decimalchain.com/web3/',
  WORKING_ADDRESS: process.env.DECIMAL_WORKING_ADDRESS
};

class ForceTransactionProcessor {
  constructor() {
    this.db = null;
    this.web3 = null;
    this.results = {
      timestamp: new Date(),
      processed: [],
      errors: []
    };
  }

  async initialize() {
    console.log('🔧 Инициализация принудительной обработки транзакций...');
    
    try {
      // Подключение к MongoDB
      const client = new MongoClient(config.MONGODB_URI);
      await client.connect();
      this.db = client.db('tapdel');
      console.log('✅ MongoDB подключен');

      // Подключение к DecimalChain
      this.web3 = new Web3(config.DECIMAL_RPC_URL);
      const blockNumber = await this.web3.eth.getBlockNumber();
      console.log(`✅ DecimalChain подключен, блок: ${blockNumber}`);

    } catch (error) {
      console.error('❌ Ошибка инициализации:', error);
      throw error;
    }
  }

  async processUnmatchedDeposits() {
    console.log('\n💰 Обработка необработанных депозитов...');
    
    try {
      // Находим все необработанные депозиты
      const unmatchedDeposits = await this.db.collection('deposits').find({
        matched: false,
        expiresAt: { $gt: new Date() }
      }).toArray();

      console.log(`📊 Найдено ${unmatchedDeposits.length} необработанных депозитов`);

      for (const deposit of unmatchedDeposits) {
        try {
          console.log(`🔍 Проверяем депозит ${deposit._id}: ${deposit.uniqueAmount} DEL`);
          
          // Получаем последние блоки для поиска транзакций
          const currentBlock = await this.web3.eth.getBlockNumber();
          const startBlock = Math.max(0, Number(currentBlock) - 1000); // Последние 1000 блоков
          
          let found = false;
          
          // Проверяем блоки в обратном порядке
          for (let blockNum = Number(currentBlock); blockNum >= startBlock; blockNum--) {
            try {
              const block = await this.web3.eth.getBlock(blockNum, true);
              
              if (!block.transactions) continue;

              for (const tx of block.transactions) {
                if (tx.to && tx.to.toLowerCase() === config.WORKING_ADDRESS.toLowerCase()) {
                  const value = parseFloat(this.web3.utils.fromWei(tx.value, 'ether'));
                  
                  // Округляем value до 4 знаков после запятой
                  const roundedValue = Math.round(value * 10000) / 10000;
                  const depositValue = Math.round(deposit.uniqueAmount * 10000) / 10000;
                  const EPSILON = 0.00005;
                  
                  if (Math.abs(roundedValue - depositValue) <= EPSILON) {
                    console.log(`💰 Найдена транзакция для депозита ${deposit._id}: ${tx.hash}`);
                    
                    // Обновляем депозит
                    await this.db.collection('deposits').updateOne(
                      { _id: deposit._id },
                      {
                        $set: {
                          txHash: tx.hash,
                          matched: true,
                          confirmations: 1,
                          matchedAt: new Date()
                        }
                      }
                    );

                    // Получаем пользователя
                    const user = await this.db.collection('users').findOne({ userId: deposit.userId });
                    if (user) {
                      // Обновляем баланс пользователя
                      const currentTokens = user.gameState?.tokens || 0;
                      const newTokens = currentTokens + deposit.amountRequested;
                      
                      await this.db.collection('users').updateOne(
                        { userId: deposit.userId },
                        {
                          $set: {
                            "gameState.tokens": newTokens,
                            "gameState.lastSaved": new Date(),
                            updatedAt: new Date()
                          }
                        }
                      );

                      console.log(`✅ Баланс обновлен: ${deposit.userId} ${currentTokens} → ${newTokens} DEL`);
                      
                      this.results.processed.push({
                        type: 'deposit_matched',
                        depositId: deposit._id.toString(),
                        userId: deposit.userId,
                        amount: deposit.amountRequested,
                        txHash: tx.hash
                      });
                    }
                    
                    found = true;
                    break;
                  }
                }
              }
              
              if (found) break;
              
            } catch (error) {
              console.log(`⚠️ Ошибка проверки блока ${blockNum}:`, error.message);
              continue;
            }
          }
          
          if (!found) {
            console.log(`❌ Транзакция для депозита ${deposit._id} не найдена`);
          }
          
        } catch (error) {
          console.error(`❌ Ошибка обработки депозита ${deposit._id}:`, error);
          this.results.errors.push({
            type: 'deposit_processing',
            depositId: deposit._id.toString(),
            error: error.message
          });
        }
      }

      console.log('✅ Обработка депозитов завершена');
    } catch (error) {
      console.error('❌ Ошибка обработки депозитов:', error);
      this.results.errors.push({
        type: 'deposits_processing',
        error: error.message
      });
    }
  }

  async processQueuedWithdrawals() {
    console.log('\n💸 Обработка выводов в очереди...');
    
    try {
      // Находим выводы в очереди
      const queuedWithdrawals = await this.db.collection('withdrawals').find({
        status: 'queued'
      }).toArray();

      console.log(`📊 Найдено ${queuedWithdrawals.length} выводов в очереди`);

      for (const withdrawal of queuedWithdrawals) {
        try {
          console.log(`🔄 Обрабатываем вывод ${withdrawal._id}: ${withdrawal.amount} DEL`);
          
          // Помечаем как обрабатываемый
          await this.db.collection('withdrawals').updateOne(
            { _id: withdrawal._id },
            { $set: { status: 'processing', processingStartedAt: new Date() } }
          );

          // Здесь должна быть логика отправки транзакции
          // Но пока просто помечаем как failed и возвращаем средства
          const amount = parseFloat(withdrawal.amount);
          
          // Возвращаем средства пользователю
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
                error: 'Manual processing required - Redis unavailable',
                processedAt: new Date()
              },
              $unset: { processingStartedAt: 1 }
            }
          );

          console.log(`💰 Средства возвращены пользователю ${withdrawal.userId}: +${amount} DEL`);
          
          this.results.processed.push({
            type: 'withdrawal_refunded',
            withdrawalId: withdrawal._id.toString(),
            userId: withdrawal.userId,
            amount: amount
          });
          
        } catch (error) {
          console.error(`❌ Ошибка обработки вывода ${withdrawal._id}:`, error);
          this.results.errors.push({
            type: 'withdrawal_processing',
            withdrawalId: withdrawal._id.toString(),
            error: error.message
          });
        }
      }

      console.log('✅ Обработка выводов завершена');
    } catch (error) {
      console.error('❌ Ошибка обработки выводов:', error);
      this.results.errors.push({
        type: 'withdrawals_processing',
        error: error.message
      });
    }
  }

  async updateConfirmations() {
    console.log('\n📋 Обновление подтверждений...');
    
    try {
      const currentBlock = await this.web3.eth.getBlockNumber();
      const currentBlockNum = Number(currentBlock);

      // Находим депозиты ожидающие подтверждения
      const pendingDeposits = await this.db.collection('deposits').find({
        matched: true,
        confirmations: { $lt: 6 }
      }).toArray();

      console.log(`📊 Найдено ${pendingDeposits.length} депозитов ожидающих подтверждения`);

      for (const deposit of pendingDeposits) {
        try {
          if (deposit.txHash) {
            const receipt = await this.web3.eth.getTransactionReceipt(deposit.txHash);
            if (receipt) {
              const confirmations = currentBlockNum - Number(receipt.blockNumber) + 1;
              
              await this.db.collection('deposits').updateOne(
                { _id: deposit._id },
                { $set: { confirmations: Math.max(0, confirmations) } }
              );

              console.log(`📋 Депозит ${deposit._id}: ${confirmations} подтверждений`);
            }
          }
        } catch (error) {
          console.log(`⚠️ Ошибка обновления подтверждений для ${deposit._id}:`, error.message);
        }
      }

      console.log('✅ Обновление подтверждений завершено');
    } catch (error) {
      console.error('❌ Ошибка обновления подтверждений:', error);
      this.results.errors.push({
        type: 'confirmations_update',
        error: error.message
      });
    }
  }

  async generateSummary() {
    console.log('\n📋 Генерация сводки...');
    
    const summary = {
      totalProcessed: this.results.processed.length,
      totalErrors: this.results.errors.length,
      processedTypes: {},
      errorTypes: {}
    };

    // Группировка по типам обработки
    for (const item of this.results.processed) {
      summary.processedTypes[item.type] = (summary.processedTypes[item.type] || 0) + 1;
    }

    // Группировка по типам ошибок
    for (const error of this.results.errors) {
      summary.errorTypes[error.type] = (summary.errorTypes[error.type] || 0) + 1;
    }

    this.results.summary = summary;
    console.log('✅ Сводка сгенерирована');
  }

  async runForceProcessing() {
    console.log('🚀 Запуск принудительной обработки транзакций...\n');
    
    try {
      await this.initialize();
      
      await this.processUnmatchedDeposits();
      await this.processQueuedWithdrawals();
      await this.updateConfirmations();
      
      await this.generateSummary();
      
      console.log('\n📊 Результаты обработки:');
      console.log(JSON.stringify(this.results, null, 2));
      
      // Сохранение результатов
      const processingCollection = this.db.collection('force_processing');
      await processingCollection.insertOne({
        ...this.results,
        createdAt: new Date()
      });
      
      console.log('\n✅ Принудительная обработка завершена и сохранена в базе данных');
      
    } catch (error) {
      console.error('❌ Ошибка принудительной обработки:', error);
    } finally {
      process.exit(0);
    }
  }
}

// Запуск принудительной обработки
const processor = new ForceTransactionProcessor();
processor.runForceProcessing(); 