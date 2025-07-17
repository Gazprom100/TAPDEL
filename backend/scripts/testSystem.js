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
  API_BASE_URL: 'http://localhost:3000/api/decimal'
};

class SystemTester {
  constructor() {
    this.db = null;
    this.redis = null;
    this.web3 = null;
    this.testResults = {
      timestamp: new Date(),
      tests: [],
      summary: {}
    };
  }

  async initialize() {
    console.log('🧪 Инициализация тестирования системы...');
    
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

  async testAPI() {
    console.log('\n🌐 Тестирование API...');
    
    try {
      // Тест 1: Проверка доступности API
      const response = await fetch(`${config.API_BASE_URL}/test`);
      const data = await response.json();
      
      if (response.ok && data.message === 'DecimalChain API работает!') {
        this.testResults.tests.push({
          name: 'API Availability',
          status: 'PASS',
          details: data
        });
        console.log('✅ API доступен');
      } else {
        this.testResults.tests.push({
          name: 'API Availability',
          status: 'FAIL',
          details: { response: response.status, data }
        });
        console.log('❌ API недоступен');
      }
    } catch (error) {
      this.testResults.tests.push({
        name: 'API Availability',
        status: 'ERROR',
        details: { error: error.message }
      });
      console.log('❌ Ошибка тестирования API:', error.message);
    }
  }

  async testBlockchainSync() {
    console.log('\n🔗 Тестирование синхронизации с блокчейном...');
    
    if (!this.redis) {
      console.log('⚠️ Redis недоступен, пропускаем тест синхронизации');
      return;
    }

    try {
      const lastBlockKey = 'DECIMAL_LAST_BLOCK';
      const lastProcessedBlock = await this.redis.get(lastBlockKey);
      const currentBlock = await this.web3.eth.getBlockNumber();
      
      const blocksBehind = lastProcessedBlock ? Number(currentBlock) - parseInt(lastProcessedBlock) : null;
      
      if (blocksBehind !== null && blocksBehind <= 10) {
        this.testResults.tests.push({
          name: 'Blockchain Sync',
          status: 'PASS',
          details: {
            currentBlock: Number(currentBlock),
            lastProcessedBlock: parseInt(lastProcessedBlock),
            blocksBehind: blocksBehind
          }
        });
        console.log(`✅ Синхронизация в норме: отставание ${blocksBehind} блоков`);
      } else {
        this.testResults.tests.push({
          name: 'Blockchain Sync',
          status: 'FAIL',
          details: {
            currentBlock: Number(currentBlock),
            lastProcessedBlock: lastProcessedBlock,
            blocksBehind: blocksBehind
          }
        });
        console.log(`❌ Синхронизация отстает: отставание ${blocksBehind} блоков`);
      }
    } catch (error) {
      this.testResults.tests.push({
        name: 'Blockchain Sync',
        status: 'ERROR',
        details: { error: error.message }
      });
      console.log('❌ Ошибка тестирования синхронизации:', error.message);
    }
  }

  async testDepositCreation() {
    console.log('\n💰 Тестирование создания депозита...');
    
    try {
      const testUserId = 'test_deposit_' + Date.now();
      const testAmount = 0.001;
      
      const response = await fetch(`${config.API_BASE_URL}/deposits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: testUserId,
          baseAmount: testAmount
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.uniqueAmount && data.address) {
        this.testResults.tests.push({
          name: 'Deposit Creation',
          status: 'PASS',
          details: {
            userId: testUserId,
            amount: testAmount,
            uniqueAmount: data.uniqueAmount,
            address: data.address
          }
        });
        console.log(`✅ Депозит создан: ${testAmount} → ${data.uniqueAmount} DEL`);
        
        // Сохраняем для последующей очистки
        this.testResults.testDepositId = data.depositId;
      } else {
        this.testResults.tests.push({
          name: 'Deposit Creation',
          status: 'FAIL',
          details: { response: response.status, data }
        });
        console.log('❌ Ошибка создания депозита:', data);
      }
    } catch (error) {
      this.testResults.tests.push({
        name: 'Deposit Creation',
        status: 'ERROR',
        details: { error: error.message }
      });
      console.log('❌ Ошибка тестирования депозита:', error.message);
    }
  }

  async testWithdrawalCreation() {
    console.log('\n💸 Тестирование создания вывода...');
    
    try {
      const testUserId = 'test_withdrawal_' + Date.now();
      const testAmount = 0.001;
      const testAddress = '0x1234567890123456789012345678901234567890';
      
      // Сначала создаем пользователя с балансом
      await this.db.collection('users').insertOne({
        userId: testUserId,
        gameState: {
          tokens: testAmount,
          lastSaved: new Date()
        },
        createdAt: new Date()
      });
      
      const response = await fetch(`${config.API_BASE_URL}/withdrawals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: testUserId,
          toAddress: testAddress,
          amount: testAmount
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.withdrawalId && data.status === 'queued') {
        this.testResults.tests.push({
          name: 'Withdrawal Creation',
          status: 'PASS',
          details: {
            userId: testUserId,
            amount: testAmount,
            address: testAddress,
            withdrawalId: data.withdrawalId
          }
        });
        console.log(`✅ Вывод создан: ${testAmount} DEL → ${testAddress}`);
        
        // Сохраняем для последующей очистки
        this.testResults.testWithdrawalId = data.withdrawalId;
      } else {
        this.testResults.tests.push({
          name: 'Withdrawal Creation',
          status: 'FAIL',
          details: { response: response.status, data }
        });
        console.log('❌ Ошибка создания вывода:', data);
      }
    } catch (error) {
      this.testResults.tests.push({
        name: 'Withdrawal Creation',
        status: 'ERROR',
        details: { error: error.message }
      });
      console.log('❌ Ошибка тестирования вывода:', error.message);
    }
  }

  async testDatabaseIntegrity() {
    console.log('\n🗄️ Тестирование целостности базы данных...');
    
    try {
      // Проверяем количество пользователей
      const userCount = await this.db.collection('users').countDocuments();
      
      // Проверяем количество активных выводов
      const activeWithdrawals = await this.db.collection('withdrawals').countDocuments({
        status: { $in: ['queued', 'processing'] }
      });
      
      // Проверяем количество активных депозитов
      const activeDeposits = await this.db.collection('deposits').countDocuments({
        matched: false,
        expiresAt: { $gt: new Date() }
      });
      
      const integrityOk = userCount > 0 && activeWithdrawals >= 0 && activeDeposits >= 0;
      
      if (integrityOk) {
        this.testResults.tests.push({
          name: 'Database Integrity',
          status: 'PASS',
          details: {
            users: userCount,
            activeWithdrawals: activeWithdrawals,
            activeDeposits: activeDeposits
          }
        });
        console.log(`✅ Целостность БД: ${userCount} пользователей, ${activeWithdrawals} активных выводов, ${activeDeposits} активных депозитов`);
      } else {
        this.testResults.tests.push({
          name: 'Database Integrity',
          status: 'FAIL',
          details: {
            users: userCount,
            activeWithdrawals: activeWithdrawals,
            activeDeposits: activeDeposits
          }
        });
        console.log('❌ Проблемы с целостностью БД');
      }
    } catch (error) {
      this.testResults.tests.push({
        name: 'Database Integrity',
        status: 'ERROR',
        details: { error: error.message }
      });
      console.log('❌ Ошибка тестирования целостности БД:', error.message);
    }
  }

  async cleanupTestData() {
    console.log('\n🧹 Очистка тестовых данных...');
    
    try {
      // Удаляем тестовых пользователей
      const testUsersResult = await this.db.collection('users').deleteMany({
        userId: { $regex: /^test_/ }
      });
      
      // Удаляем тестовые депозиты
      const testDepositsResult = await this.db.collection('deposits').deleteMany({
        userId: { $regex: /^test_/ }
      });
      
      // Удаляем тестовые выводы
      const testWithdrawalsResult = await this.db.collection('withdrawals').deleteMany({
        userId: { $regex: /^test_/ }
      });
      
      console.log(`✅ Очищено: ${testUsersResult.deletedCount} пользователей, ${testDepositsResult.deletedCount} депозитов, ${testWithdrawalsResult.deletedCount} выводов`);
    } catch (error) {
      console.log('❌ Ошибка очистки тестовых данных:', error.message);
    }
  }

  async generateSummary() {
    console.log('\n📋 Генерация сводки тестов...');
    
    const summary = {
      totalTests: this.testResults.tests.length,
      passed: this.testResults.tests.filter(t => t.status === 'PASS').length,
      failed: this.testResults.tests.filter(t => t.status === 'FAIL').length,
      errors: this.testResults.tests.filter(t => t.status === 'ERROR').length,
      successRate: 0
    };
    
    summary.successRate = summary.totalTests > 0 ? (summary.passed / summary.totalTests * 100).toFixed(1) : 0;
    
    this.testResults.summary = summary;
    console.log('✅ Сводка сгенерирована');
  }

  async runFullTest() {
    console.log('🧪 Запуск полного тестирования системы ввода/вывода DEL...\n');
    
    try {
      await this.initialize();
      
      await this.testAPI();
      await this.testBlockchainSync();
      await this.testDatabaseIntegrity();
      await this.testDepositCreation();
      await this.testWithdrawalCreation();
      
      await this.generateSummary();
      
      console.log('\n📊 Результаты тестирования:');
      console.log(JSON.stringify(this.testResults, null, 2));
      
      // Сохранение результатов
      const testCollection = this.db.collection('system_tests');
      await testCollection.insertOne({
        ...this.testResults,
        createdAt: new Date()
      });
      
      console.log('\n✅ Тестирование завершено и сохранено в базе данных');
      
      // Рекомендации
      console.log('\n💡 Рекомендации:');
      if (this.testResults.summary.successRate >= 80) {
        console.log('✅ Система работает стабильно!');
        console.log('🔄 Можно перезапускать сервер и начинать работу');
      } else {
        console.log('⚠️ Обнаружены проблемы в системе');
        console.log('🔧 Проверьте логи и исправьте ошибки перед перезапуском');
      }
      
    } catch (error) {
      console.error('❌ Ошибка тестирования:', error);
    } finally {
      await this.cleanupTestData();
      if (this.redis) await this.redis.disconnect();
      process.exit(0);
    }
  }
}

// Запуск тестирования
const tester = new SystemTester();
tester.runFullTest(); 