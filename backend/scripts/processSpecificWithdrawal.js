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

class SpecificWithdrawalProcessor {
  constructor() {
    this.db = null;
    this.web3 = null;
  }

  async initialize() {
    console.log('🔧 Инициализация обработки конкретного вывода...');
    
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
      
      // Создаем транзакцию
      const transaction = {
        from: this.web3.utils.toChecksumAddress(fromAddress),
        to: this.web3.utils.toChecksumAddress(toAddress),
        value: this.web3.utils.toWei(amountNum.toString(), 'ether'),
        gas: config.GAS_LIMIT,
        gasPrice: this.web3.utils.toWei(config.GAS_PRICE.toString(), 'gwei'),
        nonce: nonce,
        chainId: config.CHAIN_ID
      };

      console.log(`📋 Транзакция создана:`, {
        from: transaction.from,
        to: transaction.to,
        value: amountNum + ' DEL',
        valueWei: transaction.value,
        gas: transaction.gas,
        gasPrice: config.GAS_PRICE + ' gwei'
      });

      // Подписываем транзакцию
      const signedTx = await this.web3.eth.accounts.signTransaction(transaction, config.PRIVATE_KEY);
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

  async processWithdrawal(withdrawalId) {
    console.log(`🔄 Обработка вывода: ${withdrawalId}`);
    
    try {
      // Получаем вывод из базы данных
      const withdrawal = await this.db.collection('withdrawals').findOne({
        _id: new (require('mongodb').ObjectId)(withdrawalId)
      });

      if (!withdrawal) {
        console.log(`❌ Вывод ${withdrawalId} не найден`);
        return;
      }

      console.log(`📋 Детали вывода:`);
      console.log(`   Пользователь: ${withdrawal.userId}`);
      console.log(`   Сумма: ${withdrawal.amount} DEL`);
      console.log(`   Адрес: ${withdrawal.toAddress}`);
      console.log(`   Статус: ${withdrawal.status}`);
      console.log(`   Создан: ${withdrawal.requestedAt}`);

      if (withdrawal.status === 'sent') {
        console.log(`✅ Вывод уже обработан, TX: ${withdrawal.txHash}`);
        return;
      }

      if (withdrawal.status === 'failed') {
        console.log(`❌ Вывод уже помечен как failed: ${withdrawal.error}`);
        return;
      }

      // Проверяем баланс пользователя
      const user = await this.db.collection('users').findOne({ userId: withdrawal.userId });
      if (!user) {
        console.log(`❌ Пользователь ${withdrawal.userId} не найден`);
        return;
      }

      const userBalance = user.gameState?.tokens || 0;
      console.log(`💰 Баланс пользователя: ${userBalance} DEL`);

      if (userBalance < withdrawal.amount) {
        console.log(`❌ Недостаточно средств: ${userBalance} < ${withdrawal.amount}`);
        
        // Возвращаем вывод в очередь
        await this.db.collection('withdrawals').updateOne(
          { _id: withdrawal._id },
          {
            $set: {
              status: 'queued',
              error: 'Insufficient balance'
            },
            $unset: { processingStartedAt: 1 }
          }
        );
        
        console.log(`🔄 Вывод возвращен в очередь`);
        return;
      }

      // Отправляем транзакцию
      console.log(`🚀 Отправляем транзакцию...`);
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

      console.log(`✅ Вывод успешно обработан!`);
      console.log(`📄 TX Hash: ${txHash}`);
      
    } catch (error) {
      console.error(`❌ Ошибка обработки вывода ${withdrawalId}:`, error.message);
      
      // Помечаем как failed
      await this.db.collection('withdrawals').updateOne(
        { _id: new (require('mongodb').ObjectId)(withdrawalId) },
        {
          $set: {
            status: 'failed',
            error: error.message,
            processedAt: new Date()
          },
          $unset: { processingStartedAt: 1 }
        }
      );
      
      console.log(`❌ Вывод помечен как failed`);
    }
  }

  async runProcessing(withdrawalId) {
    console.log('🚀 Запуск обработки конкретного вывода...\n');
    
    try {
      await this.initialize();
      await this.processWithdrawal(withdrawalId);
      console.log('\n✅ Обработка завершена');
      
    } catch (error) {
      console.error('❌ Ошибка обработки:', error);
    } finally {
      process.exit(0);
    }
  }
}

// Получаем ID вывода из аргументов командной строки
const withdrawalId = process.argv[2];

if (!withdrawalId) {
  console.error('❌ Укажите ID вывода: node scripts/processSpecificWithdrawal.js <withdrawalId>');
  process.exit(1);
}

// Запуск обработки конкретного вывода
const processor = new SpecificWithdrawalProcessor();
processor.runProcessing(withdrawalId); 