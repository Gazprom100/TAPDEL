const { Web3 } = require('web3');
const redis = require('redis');
const config = require('../config/decimal');

// Импорт fetch для Node.js
const fetch = require('node-fetch');

class DecimalService {
  constructor() {
    this.web3 = new Web3(config.RPC_URL);
    this.redis = null;
    this.isWatching = false;
    this.watchInterval = null;
    this.confirmInterval = null;
    this.withdrawInterval = null;
    this.lastNoWithdrawalsLog = null;
  }

  async initialize() {
    try {
      // Проверяем конфигурацию
      if (!config.isConfigured()) {
        throw new Error('DecimalChain конфигурация неполная. Проверьте переменные окружения.');
      }

      // Подключаемся к Redis с правильной конфигурацией
      const redisConfig = config.getRedisConfig();
      console.log(`🔗 Подключаемся к Redis: ${config.isUpstash() ? 'Upstash (TLS)' : 'Local'}`);
      
      this.redis = redis.createClient(redisConfig);
      
      // Обработка ошибок Redis
      this.redis.on('error', (err) => {
        console.error('❌ Redis ошибка:', err);
      });
      
      await this.redis.connect();
      console.log('✅ DecimalService: Redis подключен');
      
      // Тестируем Redis командой ping
      const pong = await this.redis.ping();
      console.log(`✅ Redis ping: ${pong}`);
      
      // Проверяем подключение к DecimalChain
      const blockNumber = await this.web3.eth.getBlockNumber();
      console.log(`✅ DecimalService: Подключен к DecimalChain, блок: ${blockNumber}`);
      
      return true;
    } catch (error) {
      console.error('❌ DecimalService: Ошибка инициализации:', error);
      console.error('📋 Детали ошибки:', {
        message: error.message,
        code: error.code,
        redis_configured: !!config.REDIS_URL,
        upstash: config.isUpstash()
      });
      throw error;
    }
  }

  // === РАБОТА С БАЛАНСАМИ ===
  
  async getBalance(address) {
    try {
      const wei = await this.web3.eth.getBalance(this.web3.utils.toChecksumAddress(address));
      return parseFloat(this.web3.utils.fromWei(wei, 'ether'));
    } catch (error) {
      console.error('❌ DecimalService: Ошибка получения баланса:', error);
      throw error;
    }
  }

  async getWorkingBalance() {
    return this.getBalance(config.WORKING_ADDRESS);
  }

  // === РАБОТА С NONCE ===
  
  async getNonce(address, ttl = 30) {
    const key = `DECIMAL_NONCE_${address.toLowerCase()}`;
    
    try {
      const cached = await this.redis.get(key);
      let nonce;
      
      if (cached !== null) {
        nonce = parseInt(cached) + 1;
      } else {
        const transactionCount = await this.web3.eth.getTransactionCount(
          this.web3.utils.toChecksumAddress(address)
        );
        // Преобразуем BigInt в number для совместимости с Web3
        nonce = Number(transactionCount);
      }
      
      await this.redis.setEx(key, ttl, nonce.toString());
      return nonce;
    } catch (error) {
      console.error('❌ DecimalService: Ошибка получения nonce:', error);
      throw error;
    }
  }

  // === ОТПРАВКА ТРАНЗАКЦИЙ ===
  
  async signAndSend(toAddress, amount) {
    try {
      console.log(`🔍 DecimalService: Подготовка транзакции ${amount} DEL → ${toAddress}`);
      
      const privateKey = config.getPrivateKey();
      const fromAddress = config.WORKING_ADDRESS;
      
      // Преобразуем amount в число
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error(`Invalid amount: ${amount}`);
      }
      
      console.log(`📊 DecimalService: Сумма: ${amountNum} DEL`);
      
      // Получаем nonce
      const nonce = await this.getNonce(fromAddress);
      console.log(`📝 DecimalService: Nonce: ${nonce}`);
      
      // Создаем транзакцию
      // DecimalChain использует 18 десятичных знаков как Ethereum
      const transaction = {
        from: this.web3.utils.toChecksumAddress(fromAddress),
        to: this.web3.utils.toChecksumAddress(toAddress),
        value: this.web3.utils.toWei(amountNum.toString(), 'ether'), // 1 DEL = 10^18 wei
        gas: config.GAS_LIMIT,
        gasPrice: this.web3.utils.toWei(config.GAS_PRICE.toString(), 'gwei'),
        nonce: nonce,
        chainId: config.CHAIN_ID
      };

      console.log(`📋 DecimalService: Транзакция создана:`, {
        from: transaction.from,
        to: transaction.to,
        value: amountNum + ' DEL',
        valueWei: transaction.value,
        gas: transaction.gas,
        gasPrice: config.GAS_PRICE + ' gwei'
      });

      // Подписываем транзакцию
      const signedTx = await this.web3.eth.accounts.signTransaction(transaction, privateKey);
      console.log(`✍️ DecimalService: Транзакция подписана`);
      
      // Отправляем транзакцию
      const receipt = await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);
      
      console.log(`✅ DecimalService: Транзакция отправлена: ${receipt.transactionHash}`);
      return receipt.transactionHash;
      
    } catch (error) {
      console.error('❌ DecimalService: Ошибка отправки транзакции:', error);
      throw error;
    }
  }

  // === МОНИТОРИНГ ДЕПОЗИТОВ ===
  
  async startWatching(database) {
    if (this.isWatching) {
      console.log('⚠️ DecimalService: Мониторинг уже запущен');
      return;
    }

    this.isWatching = true;
    console.log('🔍 DecimalService: Запуск мониторинга депозитов...');

    // Запускаем все воркеры
    this.startDepositWatcher(database);
    this.startConfirmationUpdater(database);
    this.startWithdrawalWorker(database);
    this.startExpiredDepositsCleaner(database);
  }

  async startDepositWatcher(database) {
    const pollInterval = 10000; // 10 секунд
    
    this.watchInterval = setInterval(async () => {
      try {
        // Проверяем есть ли активные депозиты или выводы
        const activeDeposits = await database.collection('deposits').countDocuments({
          matched: false,
          expiresAt: { $gt: new Date() }
        });
        
        const activeWithdrawals = await database.collection('withdrawals').countDocuments({
          status: { $in: ['queued', 'processing'] }
        });
        
        // Если нет активных заявок, пропускаем мониторинг блоков
        if (activeDeposits === 0 && activeWithdrawals === 0) {
          console.log('💤 DecimalService: Нет активных заявок, пропускаем мониторинг блоков');
          return;
        }
        
        console.log(`🔍 DecimalService: Мониторинг блоков (депозитов: ${activeDeposits}, выводов: ${activeWithdrawals})`);
        
        // Получаем последний обработанный блок
        const lastBlockKey = 'DECIMAL_LAST_BLOCK';
        let lastBlock = await this.redis.get(lastBlockKey);
        
        if (!lastBlock) {
          const currentBlock = await this.web3.eth.getBlockNumber();
          lastBlock = Number(currentBlock) - 5; // Начинаем с 5 блоков назад
        } else {
          lastBlock = parseInt(lastBlock);
        }

        const latestBlock = await this.web3.eth.getBlockNumber();
        const latestBlockNum = Number(latestBlock); // Преобразуем BigInt в число
        
        // Обрабатываем новые блоки
        for (let blockNum = lastBlock + 1; blockNum <= latestBlockNum; blockNum++) {
          await this.processBlock(blockNum, database);
          await this.redis.set(lastBlockKey, blockNum.toString());
        }
        
      } catch (error) {
        console.error('❌ DecimalService: Ошибка мониторинга депозитов:', error);
      }
    }, pollInterval);
  }

  async processBlock(blockNumber, database) {
    try {
      const block = await this.web3.eth.getBlock(blockNumber, true);
      
      if (!block.transactions) return;

      for (const tx of block.transactions) {
        if (tx.to && tx.to.toLowerCase() === config.WORKING_ADDRESS.toLowerCase()) {
          const value = parseFloat(this.web3.utils.fromWei(tx.value, 'ether'));
          
          // Округляем value до 4 знаков после запятой
          const roundedValue = Math.round(value * 10000) / 10000;
          const EPSILON = 0.00005;
          
          // Ищем депозит с такой уникальной суммой (с допуском)
          // Округляем uniqueAmount до 4 знаков для сравнения
          const deposit = await database.collection('deposits').findOne({
            $expr: {
              $and: [
                { $gte: [{ $round: ["$uniqueAmount", 4] }, roundedValue - EPSILON] },
                { $lte: [{ $round: ["$uniqueAmount", 4] }, roundedValue + EPSILON] }
              ]
            },
            matched: false
          });

          if (deposit) {
            console.log(`💰 DecimalService: Найден депозит! ${deposit.userId}: ${deposit.amountRequested} DEL (tx: ${tx.hash})`);
            
            // Обновляем депозит
            await database.collection('deposits').updateOne(
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

            // Получаем текущего пользователя
            const user = await database.collection('users').findOne({ userId: deposit.userId });
            if (!user) {
              console.error(`❌ DecimalService: Пользователь ${deposit.userId} не найден для депозита`);
              continue;
            }

            // Обновляем баланс пользователя в базе данных
            const currentTokens = user.gameState?.tokens || 0;
            const newTokens = currentTokens + deposit.amountRequested;
            
            await database.collection('users').updateOne(
              { userId: deposit.userId },
              {
                $set: {
                  "gameState.tokens": newTokens,
                  "gameState.lastSaved": new Date(),
                  updatedAt: new Date()
                }
              }
            );

            // Обновляем лидерборд
            await this.updateUserInLeaderboard(database, user, newTokens);

            console.log(`✅ DecimalService: Баланс обновлен! ${deposit.userId}: ${currentTokens} → ${newTokens} DEL`);
          }
        }
      }
    } catch (error) {
      console.error(`❌ DecimalService: Ошибка обработки блока ${blockNumber}:`, error);
    }
  }

  async startConfirmationUpdater(database) {
    this.confirmInterval = setInterval(async () => {
      try {
        // Находим депозиты ожидающие подтверждения
        const pendingDeposits = await database.collection('deposits').find({
          matched: true,
          confirmations: { $lt: config.CONFIRMATIONS }
        }).toArray();

        const currentBlock = await this.web3.eth.getBlockNumber();
        const currentBlockNum = Number(currentBlock); // Преобразуем BigInt в число

        for (const deposit of pendingDeposits) {
          if (deposit.txHash) {
            try {
              const receipt = await this.web3.eth.getTransactionReceipt(deposit.txHash);
              if (receipt) {
                const confirmations = currentBlockNum - Number(receipt.blockNumber) + 1;
                
                await database.collection('deposits').updateOne(
                  { _id: deposit._id },
                  { $set: { confirmations: Math.max(0, confirmations) } }
                );
              }
            } catch (error) {
              console.error(`❌ DecimalService: Ошибка обновления подтверждений для ${deposit.txHash}:`, error);
            }
          }
        }
      } catch (error) {
        console.error('❌ DecimalService: Ошибка обновления подтверждений:', error);
      }
    }, 15000); // 15 секунд
  }

  async startWithdrawalWorker(database) {
    this.withdrawInterval = setInterval(async () => {
      try {
        // Проверяем есть ли выводы для обработки
        const queuedWithdrawals = await database.collection('withdrawals').countDocuments({
          status: 'queued'
        });
        
        const processingWithdrawals = await database.collection('withdrawals').countDocuments({
          status: 'processing'
        });
        
        // Если нет выводов для обработки, пропускаем
        if (queuedWithdrawals === 0 && processingWithdrawals === 0) {
          return; // Тихо пропускаем, не засоряем логи
        }
        
        console.log(`🔄 DecimalService: Проверка выводов (в очереди: ${queuedWithdrawals}, в обработке: ${processingWithdrawals})`);
        
        // Проверяем застрявшие выводы в статусе processing
        const stuckWithdrawals = await database.collection('withdrawals').find({
          status: 'processing',
          processingStartedAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) } // 5 минут
        }).toArray();

        if (stuckWithdrawals.length > 0) {
          console.log(`⚠️ DecimalService: Найдено ${stuckWithdrawals.length} застрявших выводов`);
        }

        for (const stuck of stuckWithdrawals) {
          console.log(`⚠️ DecimalService: Застрявший вывод ${stuck._id} для ${stuck.userId}, помечаем как failed`);
          
          await database.collection('withdrawals').updateOne(
            { _id: stuck._id },
            {
              $set: {
                status: 'failed',
                error: 'Timeout - processing took too long',
                processedAt: new Date()
              },
              $unset: { processingStartedAt: 1 }
            }
          );
          
          // Возвращаем средства пользователю
          await database.collection('users').updateOne(
            { userId: stuck.userId },
            { $inc: { "gameState.tokens": stuck.amount } }
          );
          
          console.log(`💰 DecimalService: Средства возвращены пользователю ${stuck.userId}: +${stuck.amount} DEL`);
        }

        // Находим ожидающий вывод и сразу помечаем его как обрабатываемый
        const withdrawal = await database.collection('withdrawals').findOneAndUpdate(
          { status: 'queued' },
          { $set: { status: 'processing', processingStartedAt: new Date() } },
          { returnDocument: 'after' }
        );

        if (withdrawal && withdrawal.value) {
          const withdrawalData = withdrawal.value;
          try {
            console.log(`🔄 DecimalService: Начинаем обработку вывода ${withdrawalData._id} для ${withdrawalData.userId}`);
            console.log(`📋 Детали вывода: ${withdrawalData.amount} DEL → ${withdrawalData.toAddress}`);
            
            const txHash = await this.signAndSend(withdrawalData.toAddress, withdrawalData.amount);
            
            await database.collection('withdrawals').updateOne(
              { _id: withdrawalData._id },
              {
                $set: {
                  txHash: txHash,
                  status: 'sent',
                  processedAt: new Date()
                }
              }
            );

            console.log(`💸 DecimalService: Вывод обработан: ${withdrawalData.amount} DEL → ${withdrawalData.toAddress}`);
            console.log(`📄 TX Hash: ${txHash}`);
            
          } catch (error) {
            console.error(`❌ DecimalService: Ошибка вывода для ${withdrawalData.userId}:`, error.message);
            
            // Возвращаем статус в queued для повторной попытки
            await database.collection('withdrawals').updateOne(
              { _id: withdrawalData._id },
              {
                $set: {
                  status: 'queued',
                  error: error.message,
                  lastErrorAt: new Date()
                },
                $unset: { processingStartedAt: 1 }
              }
            );
          }
        }
      } catch (error) {
        console.error('❌ DecimalService: Ошибка воркера выводов:', error);
      }
    }, 15000); // 15 секунд
  }

  async startExpiredDepositsCleaner(database) {
    this.cleanerInterval = setInterval(async () => {
      try {
        // Находим истекшие депозиты (не обработанные и истекшие)
        const expiredDeposits = await database.collection('deposits').find({
          matched: false,
          expiresAt: { $lt: new Date() }
        }).toArray();

        if (expiredDeposits.length > 0) {
          console.log(`🧹 DecimalService: Найдено ${expiredDeposits.length} истекших депозитов`);
          
          for (const deposit of expiredDeposits) {
            const timeExpired = Math.round((new Date() - deposit.expiresAt) / 1000 / 60);
            console.log(`   - ${deposit.userId}: ${deposit.uniqueAmount} DEL (истек ${timeExpired} мин назад)`);
          }
          
          // Помечаем истекшие депозиты как expired
          const result = await database.collection('deposits').updateMany(
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
          
          console.log(`✅ DecimalService: ${result.modifiedCount} депозитов помечены как истекшие`);
        }
        
      } catch (error) {
        console.error('❌ DecimalService: Ошибка очистки истекших депозитов:', error);
      }
    }, 60000); // Проверяем каждую минуту
  }

  async stopWatching() {
    this.isWatching = false;
    
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
    }
    
    if (this.confirmInterval) {
      clearInterval(this.confirmInterval);
      this.confirmInterval = null;
    }
    
    if (this.withdrawInterval) {
      clearInterval(this.withdrawInterval);
      this.withdrawInterval = null;
    }
    
    if (this.cleanerInterval) {
      clearInterval(this.cleanerInterval);
      this.cleanerInterval = null;
    }
    
    console.log('🛑 DecimalService: Мониторинг остановлен');
  }

  async disconnect() {
    await this.stopWatching();
    
    if (this.redis) {
      await this.redis.disconnect();
      console.log('🔒 DecimalService: Redis отключен');
    }
  }

  // Вспомогательный метод для обновления пользователя в лидерборде
  async updateUserInLeaderboard(database, user, tokens) {
    try {
      const leaderboardEntry = {
        userId: user.userId,
        username: this.formatUserName(
          user.profile?.username, 
          user.profile?.telegramFirstName || user.telegramFirstName, 
          user.profile?.telegramLastName || user.telegramLastName, 
          user.profile?.telegramUsername || user.telegramUsername, 
          user.userId
        ),
        telegramId: user.profile?.telegramId || user.telegramId,
        telegramUsername: user.profile?.telegramUsername || user.telegramUsername,
        telegramFirstName: user.profile?.telegramFirstName || user.telegramFirstName,
        telegramLastName: user.profile?.telegramLastName || user.telegramLastName,
        tokens: tokens,
        updatedAt: new Date()
      };

      await database.collection('leaderboard').updateOne(
        { userId: user.userId },
        { $set: leaderboardEntry },
        { upsert: true }
      );

      // Обновляем ранги
      await this.updateAllRanks(database);
      
      console.log(`🏆 DecimalService: Лидерборд обновлен для ${user.userId} (${tokens} токенов)`);
    } catch (error) {
      console.error('❌ DecimalService: Ошибка обновления лидерборда:', error);
    }
  }

  // Вспомогательный метод для обновления всех рангов
  async updateAllRanks(database) {
    try {
      const users = await database.collection('leaderboard')
        .find()
        .sort({ tokens: -1 })
        .toArray();
      
      await Promise.all(users.map((user, index) => 
        database.collection('leaderboard').updateOne(
          { _id: user._id },
          { $set: { rank: index + 1 } }
        )
      ));
    } catch (error) {
      console.error('❌ DecimalService: Ошибка обновления рангов:', error);
    }
  }

  // Вспомогательный метод для форматирования имени пользователя
  formatUserName(username, firstName, lastName, telegramUsername, userId) {
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    } else if (firstName) {
      return firstName;
    } else if (telegramUsername) {
      return `@${telegramUsername}`;
    } else if (username) {
      return username;
    } else {
      return `Игрок ${userId.slice(-4)}`;
    }
  }
}

module.exports = new DecimalService(); 