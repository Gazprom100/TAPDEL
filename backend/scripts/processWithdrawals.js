const { MongoClient } = require('mongodb');
const { Web3 } = require('web3');
require('dotenv').config({ path: './.env' });

// Конфигурация
const config = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://TAPDEL:fpz%25sE62KPzmHfM@cluster0.ejo8obw.mongodb.net/tapdel?retryWrites=true&w=majority&appName=Cluster0',
  DECIMAL_RPC_URL: process.env.DECIMAL_RPC_URL || 'https://node.decimalchain.com/web3/',
  WORKING_ADDRESS: process.env.DECIMAL_WORKING_ADDRESS,
  PRIVATE_KEY: process.env.DECIMAL_PRIVATE_KEY,
  GAS_LIMIT: 21000,
  GAS_PRICE: 5, // 5 gwei
  CHAIN_ID: 75
};

class WithdrawalProcessor {
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
    console.log('🔧 Инициализация обработки выводов...');
    
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

      // Проверяем баланс рабочего кошелька
      const balance = await this.web3.eth.getBalance(config.WORKING_ADDRESS);
      const balanceEth = parseFloat(this.web3.utils.fromWei(balance, 'ether'));
      console.log(`💰 Баланс рабочего кошелька: ${balanceEth} DEL`);

    } catch (error) {
      console.error('❌ Ошибка инициализации:', error);
      throw error;
    }
  }

  async getNonce(address) {
    try {
      const transactionCount = await this.web3.eth.getTransactionCount(
        this.web3.utils.toChecksumAddress(address)
      );
      return Number(transactionCount);
    } catch (error) {
      console.error('❌ Ошибка получения nonce:', error);
      throw error;
    }
  }

  async signAndSend(toAddress, amount) {
    try {
      console.log(`🔍 Подготовка транзакции ${amount} DEL → ${toAddress}`);
      
      // ИСПРАВЛЕНИЕ: Используем расшифровку ключа из config
      const privateKey = config.getPrivateKey();
      const fromAddress = config.WORKING_ADDRESS;
      
      // Преобразуем amount в число
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error(`Invalid amount: ${amount}`);
      }
      
      console.log(`📊 Сумма: ${amountNum} DEL`);
      
      // Получаем nonce
      const nonce = await this.getNonce(fromAddress);
      console.log(`📝 Nonce: ${nonce}`);
      
      // ИСПРАВЛЕНИЕ: Используем динамический gas price
      const currentGasPrice = await config.getCurrentGasPrice();
      console.log(`⛽ Используем газ прайс: ${currentGasPrice} gwei`);
      
      // Создаем транзакцию
      const transaction = {
        from: this.web3.utils.toChecksumAddress(fromAddress),
        to: this.web3.utils.toChecksumAddress(toAddress),
        value: this.web3.utils.toWei(amountNum.toString(), 'ether'),
        gas: config.GAS_LIMIT,
        gasPrice: this.web3.utils.toWei(currentGasPrice.toString(), 'gwei'),
        nonce: nonce,
        chainId: config.CHAIN_ID
      };

      console.log(`📋 Транзакция создана:`, {
        from: transaction.from,
        to: transaction.to,
        value: amountNum + ' DEL',
        gas: transaction.gas,
        gasPrice: currentGasPrice + ' gwei'
      });

      // Подписываем транзакцию
      const signedTx = await this.web3.eth.accounts.signTransaction(transaction, privateKey);
      console.log(`✍️ Транзакция подписана`);
      
      // Отправляем транзакцию
      const receipt = await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);
      
      console.log(`✅ Транзакция отправлена: ${receipt.transactionHash}`);
      return receipt.transactionHash;
      
    } catch (error) {
      console.error('❌ Ошибка отправки транзакции:', error);
      throw error;
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
          console.log(`🔄 Обрабатываем вывод ${withdrawal._id}: ${withdrawal.amount} DEL → ${withdrawal.toAddress}`);
          
          // Помечаем как обрабатываемый
          await this.db.collection('withdrawals').updateOne(
            { _id: withdrawal._id },
            { $set: { status: 'processing', processingStartedAt: new Date() } }
          );

          // Отправляем транзакцию
          const txHash = await this.signAndSend(withdrawal.toAddress, withdrawal.amount);
          
          // Помечаем как отправленный
          await this.db.collection('withdrawals').updateOne(
            { _id: withdrawal._id },
            {
              $set: {
                txHash: txHash,
                status: 'sent',
                processedAt: new Date()
              },
              $unset: { processingStartedAt: 1 }
            }
          );

          console.log(`✅ Вывод обработан: ${withdrawal.amount} DEL → ${withdrawal.toAddress}`);
          console.log(`📄 TX Hash: ${txHash}`);
          
          this.results.processed.push({
            type: 'withdrawal_sent',
            withdrawalId: withdrawal._id.toString(),
            userId: withdrawal.userId,
            amount: withdrawal.amount,
            toAddress: withdrawal.toAddress,
            txHash: txHash
          });
          
        } catch (error) {
          console.error(`❌ Ошибка обработки вывода ${withdrawal._id}:`, error.message);
          
          // Возвращаем средства пользователю
          await this.db.collection('users').updateOne(
            { userId: withdrawal.userId },
            { $inc: { "gameState.tokens": parseFloat(withdrawal.amount) } }
          );

          // Помечаем как failed
          await this.db.collection('withdrawals').updateOne(
            { _id: withdrawal._id },
            {
              $set: {
                status: 'failed',
                error: error.message,
                processedAt: new Date()
              },
              $unset: { processingStartedAt: 1 }
            }
          );

          console.log(`💰 Средства возвращены пользователю ${withdrawal.userId}: +${withdrawal.amount} DEL`);
          
          this.results.errors.push({
            type: 'withdrawal_failed',
            withdrawalId: withdrawal._id.toString(),
            userId: withdrawal.userId,
            amount: withdrawal.amount,
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

  async processStuckWithdrawals() {
    console.log('\n⚠️ Обработка застрявших выводов...');
    
    try {
      // Находим застрявшие выводы в статусе processing
      const stuckWithdrawals = await this.db.collection('withdrawals').find({
        status: 'processing',
        processingStartedAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) } // 5 минут
      }).toArray();

      console.log(`📊 Найдено ${stuckWithdrawals.length} застрявших выводов`);

      for (const withdrawal of stuckWithdrawals) {
        try {
          console.log(`⚠️ Обрабатываем застрявший вывод ${withdrawal._id}: ${withdrawal.amount} DEL`);
          
          // Возвращаем средства пользователю
          await this.db.collection('users').updateOne(
            { userId: withdrawal.userId },
            { $inc: { "gameState.tokens": parseFloat(withdrawal.amount) } }
          );

          // Помечаем как failed
          await this.db.collection('withdrawals').updateOne(
            { _id: withdrawal._id },
            {
              $set: {
                status: 'failed',
                error: 'Timeout - processing took too long',
                processedAt: new Date()
              },
              $unset: { processingStartedAt: 1 }
            }
          );

          console.log(`💰 Средства возвращены пользователю ${withdrawal.userId}: +${withdrawal.amount} DEL`);
          
          this.results.processed.push({
            type: 'withdrawal_refunded',
            withdrawalId: withdrawal._id.toString(),
            userId: withdrawal.userId,
            amount: withdrawal.amount,
            reason: 'timeout'
          });
          
        } catch (error) {
          console.error(`❌ Ошибка обработки застрявшего вывода ${withdrawal._id}:`, error);
          this.results.errors.push({
            type: 'stuck_withdrawal_processing',
            withdrawalId: withdrawal._id.toString(),
            error: error.message
          });
        }
      }

      console.log('✅ Обработка застрявших выводов завершена');
    } catch (error) {
      console.error('❌ Ошибка обработки застрявших выводов:', error);
      this.results.errors.push({
        type: 'stuck_withdrawals_processing',
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

  async runProcessing() {
    console.log('🚀 Запуск обработки выводов...\n');
    
    try {
      await this.initialize();
      
      await this.processStuckWithdrawals();
      await this.processQueuedWithdrawals();
      
      await this.generateSummary();
      
      console.log('\n📊 Результаты обработки:');
      console.log(JSON.stringify(this.results, null, 2));
      
      // Сохранение результатов
      const processingCollection = this.db.collection('withdrawal_processing');
      await processingCollection.insertOne({
        ...this.results,
        createdAt: new Date()
      });
      
      console.log('\n✅ Обработка выводов завершена и сохранена в базе данных');
      
    } catch (error) {
      console.error('❌ Ошибка обработки выводов:', error);
    } finally {
      process.exit(0);
    }
  }
}

// Запуск обработки выводов
const processor = new WithdrawalProcessor();
processor.runProcessing(); 