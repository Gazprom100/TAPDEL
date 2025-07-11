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
      const privateKey = config.getPrivateKey();
      const fromAddress = config.WORKING_ADDRESS;
      
      // Получаем nonce
      const nonce = await this.getNonce(fromAddress);
      
      // Создаем транзакцию
      const transaction = {
        from: this.web3.utils.toChecksumAddress(fromAddress),
        to: this.web3.utils.toChecksumAddress(toAddress),
        value: this.web3.utils.toWei(amount.toString(), 'ether'),
        gas: config.GAS_LIMIT,
        gasPrice: this.web3.utils.toWei(config.GAS_PRICE.toString(), 'gwei'),
        nonce: nonce,
        chainId: config.CHAIN_ID
      };

      // Подписываем транзакцию
      const signedTx = await this.web3.eth.accounts.signTransaction(transaction, privateKey);
      
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
  }

  async startDepositWatcher(database) {
    const pollInterval = 10000; // 10 секунд
    
    this.watchInterval = setInterval(async () => {
      try {
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
          
          // Ищем депозит с такой уникальной суммой
          const deposit = await database.collection('deposits').findOne({
            uniqueAmount: value,
            matched: false
          });

          if (deposit) {
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

            // Обновляем баланс пользователя в базе данных
            await database.collection('users').updateOne(
              { userId: deposit.userId },
              {
                $inc: { "gameState.tokens": deposit.amountRequested }
              }
            );

            console.log(`💰 DecimalService: Депозит найден! ${deposit.userId}: ${deposit.amountRequested} DEL`);
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
        // Находим ожидающий вывод
        const withdrawal = await database.collection('withdrawals').findOne({
          status: 'queued'
        });

        if (withdrawal) {
          try {
            const txHash = await this.signAndSend(withdrawal.toAddress, withdrawal.amount);
            
            await database.collection('withdrawals').updateOne(
              { _id: withdrawal._id },
              {
                $set: {
                  txHash: txHash,
                  status: 'sent',
                  processedAt: new Date()
                }
              }
            );

            console.log(`💸 DecimalService: Вывод обработан: ${withdrawal.amount} DEL → ${withdrawal.toAddress}`);
            
          } catch (error) {
            await database.collection('withdrawals').updateOne(
              { _id: withdrawal._id },
              {
                $set: {
                  status: 'failed',
                  processedAt: new Date(),
                  error: error.message
                }
              }
            );
            
            // Возвращаем средства пользователю
            await database.collection('users').updateOne(
              { userId: withdrawal.userId },
              { $inc: { "gameState.tokens": withdrawal.amount } }
            );
            
            console.error(`❌ DecimalService: Ошибка вывода для ${withdrawal.userId}:`, error);
          }
        }
      } catch (error) {
        console.error('❌ DecimalService: Ошибка воркера выводов:', error);
      }
    }, 5000); // 5 секунд
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
    
    console.log('🛑 DecimalService: Мониторинг остановлен');
  }

  async disconnect() {
    await this.stopWatching();
    
    if (this.redis) {
      await this.redis.disconnect();
      console.log('🔒 DecimalService: Redis отключен');
    }
  }
}

module.exports = new DecimalService(); 