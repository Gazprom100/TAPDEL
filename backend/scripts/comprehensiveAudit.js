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

class ComprehensiveAudit {
  constructor() {
    this.db = null;
    this.redis = null;
    this.web3 = null;
    this.auditResults = {
      timestamp: new Date(),
      summary: {},
      details: {},
      recommendations: []
    };
  }

  async initialize() {
    console.log('🔍 Инициализация аудита системы ввода/вывода DEL...');
    
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

  async auditDatabaseStructure() {
    console.log('\n📊 Аудит структуры базы данных...');
    
    const collections = ['users', 'deposits', 'withdrawals', 'leaderboard'];
    const structure = {};

    for (const collectionName of collections) {
      const collection = this.db.collection(collectionName);
      const count = await collection.countDocuments();
      const indexes = await collection.indexes();
      
      structure[collectionName] = {
        documentCount: count,
        indexes: indexes.map(idx => ({
          name: idx.name,
          key: idx.key,
          unique: idx.unique || false
        }))
      };

      // Анализ последних документов
      const recentDocs = await collection.find().sort({ _id: -1 }).limit(3).toArray();
      structure[collectionName].recentDocuments = recentDocs.length;
    }

    this.auditResults.details.databaseStructure = structure;
    console.log('✅ Структура БД проанализирована');
  }

  async auditDeposits() {
    console.log('\n💰 Аудит системы депозитов...');
    
    const deposits = await this.db.collection('deposits').find().toArray();
    const analysis = {
      total: deposits.length,
      byStatus: {},
      byTimeRange: {},
      issues: []
    };

    // Группировка по статусам
    for (const deposit of deposits) {
      const status = deposit.matched ? 
        (deposit.confirmations >= 6 ? 'confirmed' : 'pending') : 
        (deposit.expiresAt < new Date() ? 'expired' : 'waiting');
      
      analysis.byStatus[status] = (analysis.byStatus[status] || 0) + 1;
    }

    // Анализ по времени
    const now = new Date();
    const oneHourAgo = new Date(now - 60 * 60 * 1000);
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

    analysis.byTimeRange = {
      lastHour: deposits.filter(d => d.createdAt > oneHourAgo).length,
      lastDay: deposits.filter(d => d.createdAt > oneDayAgo).length,
      older: deposits.filter(d => d.createdAt <= oneDayAgo).length
    };

    // Поиск проблем
    const stuckDeposits = deposits.filter(d => 
      d.matched && d.confirmations < 6 && 
      d.matchedAt < new Date(now - 30 * 60 * 1000) // 30 минут
    );

    if (stuckDeposits.length > 0) {
      analysis.issues.push({
        type: 'stuck_confirmations',
        count: stuckDeposits.length,
        details: stuckDeposits.map(d => ({
          id: d._id,
          userId: d.userId,
          amount: d.amountRequested,
          confirmations: d.confirmations,
          matchedAt: d.matchedAt
        }))
      });
    }

    const expiredUnmatched = deposits.filter(d => 
      !d.matched && d.expiresAt < new Date()
    );

    if (expiredUnmatched.length > 0) {
      analysis.issues.push({
        type: 'expired_unmatched',
        count: expiredUnmatched.length,
        details: expiredUnmatched.map(d => ({
          id: d._id,
          userId: d.userId,
          amount: d.amountRequested,
          createdAt: d.createdAt,
          expiresAt: d.expiresAt
        }))
      });
    }

    this.auditResults.details.deposits = analysis;
    console.log('✅ Депозиты проанализированы');
  }

  async auditWithdrawals() {
    console.log('\n💸 Аудит системы выводов...');
    
    const withdrawals = await this.db.collection('withdrawals').find().toArray();
    const analysis = {
      total: withdrawals.length,
      byStatus: {},
      byTimeRange: {},
      issues: []
    };

    // Группировка по статусам
    for (const withdrawal of withdrawals) {
      analysis.byStatus[withdrawal.status] = (analysis.byStatus[withdrawal.status] || 0) + 1;
    }

    // Анализ по времени
    const now = new Date();
    const oneHourAgo = new Date(now - 60 * 60 * 1000);
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

    analysis.byTimeRange = {
      lastHour: withdrawals.filter(w => w.requestedAt > oneHourAgo).length,
      lastDay: withdrawals.filter(w => w.requestedAt > oneDayAgo).length,
      older: withdrawals.filter(w => w.requestedAt <= oneDayAgo).length
    };

    // Поиск проблем
    const stuckProcessing = withdrawals.filter(w => 
      w.status === 'processing' && 
      w.processingStartedAt < new Date(now - 10 * 60 * 1000) // 10 минут
    );

    if (stuckProcessing.length > 0) {
      analysis.issues.push({
        type: 'stuck_processing',
        count: stuckProcessing.length,
        details: stuckProcessing.map(w => ({
          id: w._id,
          userId: w.userId,
          amount: w.amount,
          processingStartedAt: w.processingStartedAt
        }))
      });
    }

    const failedWithdrawals = withdrawals.filter(w => w.status === 'failed');
    if (failedWithdrawals.length > 0) {
      analysis.issues.push({
        type: 'failed_withdrawals',
        count: failedWithdrawals.length,
        details: failedWithdrawals.map(w => ({
          id: w._id,
          userId: w.userId,
          amount: w.amount,
          error: w.error,
          requestedAt: w.requestedAt
        }))
      });
    }

    this.auditResults.details.withdrawals = analysis;
    console.log('✅ Выводы проанализированы');
  }

  async auditBlockchainSync() {
    console.log('\n🔗 Аудит синхронизации с блокчейном...');
    
    if (!this.redis) {
      console.log('⚠️ Redis недоступен, пропускаем аудит синхронизации');
      return;
    }

    try {
      const lastBlockKey = 'DECIMAL_LAST_BLOCK';
      const lastProcessedBlock = await this.redis.get(lastBlockKey);
      const currentBlock = await this.web3.eth.getBlockNumber();
      
      const sync = {
        currentBlock: Number(currentBlock),
        lastProcessedBlock: lastProcessedBlock ? parseInt(lastProcessedBlock) : null,
        blocksBehind: lastProcessedBlock ? Number(currentBlock) - parseInt(lastProcessedBlock) : null,
        syncStatus: 'unknown'
      };

      if (sync.blocksBehind !== null) {
        if (sync.blocksBehind <= 5) {
          sync.syncStatus = 'synced';
        } else if (sync.blocksBehind <= 100) {
          sync.syncStatus = 'lagging';
        } else {
          sync.syncStatus = 'severely_lagging';
        }
      }

      this.auditResults.details.blockchainSync = sync;
      console.log('✅ Синхронизация с блокчейном проанализирована');
    } catch (error) {
      console.error('❌ Ошибка аудита синхронизации:', error);
    }
  }

  async auditUserBalances() {
    console.log('\n👥 Аудит балансов пользователей...');
    
    const users = await this.db.collection('users').find().toArray();
    const analysis = {
      totalUsers: users.length,
      usersWithTokens: 0,
      totalTokens: 0,
      balanceDistribution: {
        zero: 0,
        low: 0, // 0.001 - 1
        medium: 0, // 1 - 10
        high: 0 // > 10
      },
      issues: []
    };

    for (const user of users) {
      const tokens = user.gameState?.tokens || 0;
      
      if (tokens > 0) {
        analysis.usersWithTokens++;
        analysis.totalTokens += tokens;
      }

      if (tokens === 0) {
        analysis.balanceDistribution.zero++;
      } else if (tokens < 1) {
        analysis.balanceDistribution.low++;
      } else if (tokens < 10) {
        analysis.balanceDistribution.medium++;
      } else {
        analysis.balanceDistribution.high++;
      }
    }

    // Проверка на аномалии
    const highBalanceUsers = users.filter(u => (u.gameState?.tokens || 0) > 1000);
    if (highBalanceUsers.length > 0) {
      analysis.issues.push({
        type: 'high_balance_users',
        count: highBalanceUsers.length,
        details: highBalanceUsers.map(u => ({
          userId: u.userId,
          tokens: u.gameState?.tokens || 0
        }))
      });
    }

    this.auditResults.details.userBalances = analysis;
    console.log('✅ Балансы пользователей проанализированы');
  }

  async auditConfiguration() {
    console.log('\n⚙️ Аудит конфигурации...');
    
    const config = {
      environment: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        REDIS_URL: process.env.REDIS_URL ? 'configured' : 'missing',
        DECIMAL_RPC_URL: process.env.DECIMAL_RPC_URL ? 'configured' : 'default',
        DECIMAL_WORKING_ADDRESS: process.env.DECIMAL_WORKING_ADDRESS ? 'configured' : 'missing',
        DECIMAL_WORKING_PRIVKEY_ENC: process.env.DECIMAL_WORKING_PRIVKEY_ENC ? 'configured' : 'missing',
        DECIMAL_KEY_PASSPHRASE: process.env.DECIMAL_KEY_PASSPHRASE ? 'configured' : 'missing'
      },
      issues: []
    };

    // Проверка критических настроек
    if (!process.env.REDIS_URL) {
      config.issues.push('REDIS_URL не настроен');
    }
    if (!process.env.DECIMAL_WORKING_ADDRESS) {
      config.issues.push('DECIMAL_WORKING_ADDRESS не настроен');
    }
    if (!process.env.DECIMAL_WORKING_PRIVKEY_ENC) {
      config.issues.push('DECIMAL_WORKING_PRIVKEY_ENC не настроен');
    }
    if (!process.env.DECIMAL_KEY_PASSPHRASE) {
      config.issues.push('DECIMAL_KEY_PASSPHRASE не настроен');
    }

    this.auditResults.details.configuration = config;
    console.log('✅ Конфигурация проанализирована');
  }

  async generateRecommendations() {
    console.log('\n💡 Генерация рекомендаций...');
    
    const recommendations = [];

    // Анализ депозитов
    if (this.auditResults.details.deposits?.issues?.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'deposits',
        issue: 'Проблемы с депозитами',
        actions: [
          'Проверить мониторинг блокчейна',
          'Очистить истекшие депозиты',
          'Исправить застрявшие подтверждения'
        ]
      });
    }

    // Анализ выводов
    if (this.auditResults.details.withdrawals?.issues?.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'withdrawals',
        issue: 'Проблемы с выводами',
        actions: [
          'Проверить воркер выводов',
          'Исправить застрявшие транзакции',
          'Анализировать ошибки вывода'
        ]
      });
    }

    // Синхронизация с блокчейном
    const sync = this.auditResults.details.blockchainSync;
    if (sync?.syncStatus === 'severely_lagging') {
      recommendations.push({
        priority: 'critical',
        category: 'blockchain',
        issue: 'Критическое отставание синхронизации',
        actions: [
          'Сбросить lastProcessedBlock в Redis',
          'Перезапустить мониторинг',
          'Проверить RPC подключение'
        ]
      });
    }

    // Конфигурация
    if (this.auditResults.details.configuration?.issues?.length > 0) {
      recommendations.push({
        priority: 'critical',
        category: 'configuration',
        issue: 'Проблемы с конфигурацией',
        actions: this.auditResults.details.configuration.issues.map(issue => `Исправить: ${issue}`)
      });
    }

    this.auditResults.recommendations = recommendations;
    console.log('✅ Рекомендации сгенерированы');
  }

  async generateSummary() {
    console.log('\n📋 Генерация сводки...');
    
    const summary = {
      overallStatus: 'unknown',
      criticalIssues: 0,
      highPriorityIssues: 0,
      totalIssues: 0
    };

    // Подсчет проблем
    const allIssues = [
      ...(this.auditResults.details.deposits?.issues || []),
      ...(this.auditResults.details.withdrawals?.issues || []),
      ...(this.auditResults.details.configuration?.issues || [])
    ];

    summary.totalIssues = allIssues.length;

    // Определение общего статуса
    const sync = this.auditResults.details.blockchainSync;
    const configIssues = this.auditResults.details.configuration?.issues?.length || 0;

    if (configIssues > 0 || sync?.syncStatus === 'severely_lagging') {
      summary.overallStatus = 'critical';
      summary.criticalIssues = configIssues + (sync?.syncStatus === 'severely_lagging' ? 1 : 0);
    } else if (allIssues.length > 0) {
      summary.overallStatus = 'warning';
      summary.highPriorityIssues = allIssues.length;
    } else {
      summary.overallStatus = 'healthy';
    }

    this.auditResults.summary = summary;
    console.log('✅ Сводка сгенерирована');
  }

  async runFullAudit() {
    console.log('🚀 Запуск досконального аудита системы ввода/вывода DEL...\n');
    
    try {
      await this.initialize();
      
      await this.auditDatabaseStructure();
      await this.auditDeposits();
      await this.auditWithdrawals();
      await this.auditBlockchainSync();
      await this.auditUserBalances();
      await this.auditConfiguration();
      
      await this.generateRecommendations();
      await this.generateSummary();
      
      console.log('\n📊 Результаты аудита:');
      console.log(JSON.stringify(this.auditResults, null, 2));
      
      // Сохранение результатов
      const auditCollection = this.db.collection('audits');
      await auditCollection.insertOne({
        ...this.auditResults,
        createdAt: new Date()
      });
      
      console.log('\n✅ Аудит завершен и сохранен в базе данных');
      
    } catch (error) {
      console.error('❌ Ошибка аудита:', error);
    } finally {
      if (this.redis) await this.redis.disconnect();
      process.exit(0);
    }
  }
}

// Запуск аудита
const audit = new ComprehensiveAudit();
audit.runFullAudit(); 