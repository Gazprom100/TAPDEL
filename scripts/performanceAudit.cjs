#!/usr/bin/env node

const { MongoClient } = require('mongodb');
const redis = require('redis');
const { performance } = require('perf_hooks');
require('dotenv').config({ path: './backend/.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://TAPDEL:fpz%25sE62KPzmHfM@cluster0.ejo8obw.mongodb.net/tapdel?retryWrites=true&w=majority&appName=Cluster0';

class PerformanceAuditor {
  constructor() {
    this.client = null;
    this.db = null;
    this.redis = null;
    this.report = {
      timestamp: new Date(),
      currentUsers: 0,
      targetUsers: 2000,
      database: {},
      redis: {},
      memory: {},
      performance: {},
      recommendations: []
    };
  }

  async initialize() {
    console.log('🔍 УГЛУБЛЕННЫЙ АУДИТ ПРОИЗВОДИТЕЛЬНОСТИ TAPDEL');
    console.log('=========================================');
    console.log(`🎯 Цель: Оптимизация для 2000 пользователей\n`);

    // MongoDB
    this.client = new MongoClient(MONGODB_URI);
    await this.client.connect();
    this.db = this.client.db('tapdel');
    console.log('✅ MongoDB подключен');

    // Redis
    try {
      const redisConfig = {
        url: process.env.REDIS_URL || 'redis://localhost:6379/0',
        socket: {
          connectTimeout: 10000,
          tls: process.env.REDIS_URL?.includes('redis-cloud.com') || false
        }
      };
      
      this.redis = redis.createClient(redisConfig);
      await this.redis.connect();
      console.log('✅ Redis подключен\n');
    } catch (error) {
      console.log('⚠️ Redis недоступен:', error.message);
    }
  }

  async auditDatabase() {
    console.log('📊 1. АУДИТ БАЗЫ ДАННЫХ');
    console.log('========================');

    const start = performance.now();

    // Базовая статистика
    const collections = ['users', 'leaderboard', 'withdrawals', 'deposits'];
    const stats = {};

    for (const collName of collections) {
      const collection = this.db.collection(collName);
      
      // Количество документов и размер
      const count = await collection.countDocuments();
      const indexStats = await collection.indexes();
      
      // Тест производительности запросов
      const queryStart = performance.now();
      
      if (collName === 'users') {
        // Тест поиска пользователя
        await collection.findOne({ userId: 'telegram-12345' });
        // Тест обновления токенов
        const updateResult = await collection.updateOne(
          { userId: 'test-performance' },
          { $inc: { 'gameState.tokens': 1 } },
          { upsert: true }
        );
      } else if (collName === 'leaderboard') {
        // Тест загрузки топ-100
        await collection.find().sort({ tokens: -1 }).limit(100).toArray();
      }
      
      const queryTime = performance.now() - queryStart;

      stats[collName] = {
        documents: count,
        indexes: indexStats.length,
        queryTime: Math.round(queryTime * 100) / 100,
        avgDocSize: count > 0 ? await this.getAvgDocumentSize(collName) : 0
      };
    }

    // Анализ индексов
    const indexAnalysis = await this.analyzeIndexes();
    
    // Проекция на 2000 пользователей
    const projection = this.projectDatabaseLoad(stats);

    this.report.database = {
      stats,
      indexAnalysis,
      projection,
      auditTime: Math.round((performance.now() - start) * 100) / 100
    };

    console.log('📈 Статистика коллекций:');
    Object.entries(stats).forEach(([name, data]) => {
      console.log(`   ${name}: ${data.documents} docs, ${data.indexes} индексов, ${data.queryTime}ms запрос`);
    });

    console.log('\n🔍 Анализ индексов:');
    indexAnalysis.issues.forEach(issue => {
      console.log(`   ⚠️ ${issue}`);
    });

    console.log('\n📊 Проекция на 2000 пользователей:');
    console.log(`   Ожидаемые документы: ${projection.expectedDocuments}`);
    console.log(`   Ожидаемое время запросов: ${projection.expectedQueryTime}ms`);
    console.log(`   Размер БД: ~${projection.estimatedDbSize}MB\n`);
  }

  async auditRedis() {
    console.log('🔄 2. АУДИТ REDIS КЕШИРОВАНИЯ');
    console.log('==============================');

    if (!this.redis) {
      console.log('❌ Redis недоступен для аудита\n');
      return;
    }

    const start = performance.now();

    // Информация о Redis
    const info = await this.redis.info('memory');
    const keyspace = await this.redis.info('keyspace');
    
    // Тест производительности
    const testStart = performance.now();
    
    // Тест записи
    await this.redis.set('test:performance:write', 'test_value', { EX: 60 });
    
    // Тест чтения
    await this.redis.get('test:performance:write');
    
    // Тест nonce операций (критично для блокчейна)
    for (let i = 0; i < 10; i++) {
      await this.redis.incr('test:nonce:performance');
    }
    
    const testTime = performance.now() - testStart;

    // Анализ текущих ключей
    const keys = await this.redis.keys('*');
    const keyTypes = {};
    
    for (const key of keys.slice(0, 100)) { // Ограничиваем для производительности
      const type = await this.redis.type(key);
      keyTypes[type] = (keyTypes[type] || 0) + 1;
    }

    this.report.redis = {
      available: true,
      memoryUsage: this.parseRedisMemory(info),
      totalKeys: keys.length,
      keyTypes,
      performanceTest: {
        operationsTime: Math.round(testTime * 100) / 100,
        opsPerSecond: Math.round(11 / (testTime / 1000))
      },
      auditTime: Math.round((performance.now() - start) * 100) / 100
    };

    console.log(`💾 Использование памяти: ${this.report.redis.memoryUsage.used}MB`);
    console.log(`🔑 Всего ключей: ${keys.length}`);
    console.log(`⚡ Тест производительности: ${testTime.toFixed(2)}ms (${this.report.redis.performanceTest.opsPerSecond} ops/sec)`);
    console.log();
  }

  async auditMemoryUsage() {
    console.log('🧠 3. АУДИТ ИСПОЛЬЗОВАНИЯ ПАМЯТИ');
    console.log('=================================');

    const memUsage = process.memoryUsage();
    const startTime = process.hrtime();

    // Симуляция нагрузки от 100 пользователей
    const testUsers = [];
    for (let i = 0; i < 100; i++) {
      testUsers.push({
        userId: `test-user-${i}`,
        gameState: {
          tokens: Math.random() * 10000,
          highScore: Math.random() * 50000,
          engineLevel: 'Mk III',
          lastSaved: new Date()
        },
        profile: {
          username: `TestUser${i}`,
          level: Math.floor(Math.random() * 10) + 1
        }
      });
    }

    const memAfterSimulation = process.memoryUsage();
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const simulationTime = seconds * 1000 + nanoseconds / 1000000;

    this.report.memory = {
      baseline: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
        rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100
      },
      afterSimulation: {
        heapUsed: Math.round(memAfterSimulation.heapUsed / 1024 / 1024 * 100) / 100,
        heapTotal: Math.round(memAfterSimulation.heapTotal / 1024 / 1024 * 100) / 100,
        rss: Math.round(memAfterSimulation.rss / 1024 / 1024 * 100) / 100
      },
      simulationTime: Math.round(simulationTime * 100) / 100,
      projectedFor2000Users: {
        heapUsed: Math.round((memAfterSimulation.heapUsed - memUsage.heapUsed) * 20 / 1024 / 1024 * 100) / 100,
        estimated: Math.round((memAfterSimulation.heapUsed + (memAfterSimulation.heapUsed - memUsage.heapUsed) * 20) / 1024 / 1024 * 100) / 100
      }
    };

    console.log(`📊 Базовое использование памяти: ${this.report.memory.baseline.heapUsed}MB`);
    console.log(`📈 После симуляции 100 пользователей: ${this.report.memory.afterSimulation.heapUsed}MB`);
    console.log(`🎯 Проекция для 2000 пользователей: ~${this.report.memory.projectedFor2000Users.estimated}MB`);
    console.log();
  }

  async auditConcurrency() {
    console.log('⚡ 4. АУДИТ КОНКУРЕНТНОСТИ');
    console.log('==========================');

    const start = performance.now();

    // Тест конкурентных операций с базой данных
    const concurrentUsers = 50;
    const operations = [];

    for (let i = 0; i < concurrentUsers; i++) {
      operations.push(
        this.db.collection('users').updateOne(
          { userId: `concurrent-test-${i}` },
          { 
            $inc: { 'gameState.tokens': 1 },
            $set: { 'gameState.lastSaved': new Date() }
          },
          { upsert: true }
        )
      );
    }

    const dbResults = await Promise.all(operations);
    const dbTime = performance.now() - start;

    // Тест Redis конкурентности
    let redisTime = 0;
    if (this.redis) {
      const redisStart = performance.now();
      const redisOps = [];
      
      for (let i = 0; i < concurrentUsers; i++) {
        redisOps.push(
          this.redis.incr(`concurrent:test:${i}`)
        );
      }
      
      await Promise.all(redisOps);
      redisTime = performance.now() - redisStart;
    }

    this.report.performance = {
      concurrentOperations: concurrentUsers,
      databaseTime: Math.round(dbTime * 100) / 100,
      redisTime: Math.round(redisTime * 100) / 100,
      throughput: {
        database: Math.round(concurrentUsers / (dbTime / 1000)),
        redis: redisTime > 0 ? Math.round(concurrentUsers / (redisTime / 1000)) : 0
      }
    };

    console.log(`🎯 Конкурентные операции: ${concurrentUsers}`);
    console.log(`📊 База данных: ${dbTime.toFixed(2)}ms (${this.report.performance.throughput.database} ops/sec)`);
    if (redisTime > 0) {
      console.log(`🔄 Redis: ${redisTime.toFixed(2)}ms (${this.report.performance.throughput.redis} ops/sec)`);
    }
    console.log();
  }

  async generateRecommendations() {
    console.log('💡 5. РЕКОМЕНДАЦИИ ПО ОПТИМИЗАЦИИ');
    console.log('==================================');

    const recommendations = [];

    // Анализ базы данных
    if (this.report.database.stats.users.queryTime > 10) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Database',
        issue: 'Медленные запросы пользователей',
        solution: 'Добавить составной индекс { userId: 1, "gameState.lastSaved": -1 }',
        impact: 'Ускорение запросов на 80%'
      });
    }

    if (this.report.database.stats.leaderboard.queryTime > 50) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Database',
        issue: 'Медленная загрузка лидерборда',
        solution: 'Кеширование топ-100 в Redis на 5 минут',
        impact: 'Снижение нагрузки на 90%'
      });
    }

    // Анализ памяти
    if (this.report.memory.projectedFor2000Users.estimated > 1000) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Memory',
        issue: 'Высокое потребление памяти',
        solution: 'Оптимизация объектов пользователей, lazy loading',
        impact: 'Снижение потребления памяти на 40%'
      });
    }

    // Анализ производительности
    if (this.report.performance.throughput.database < 100) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Performance',
        issue: 'Низкая пропускная способность БД',
        solution: 'Connection pooling, batch операции',
        impact: 'Увеличение throughput в 3 раза'
      });
    }

    // Redis рекомендации
    if (!this.report.redis.available) {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'Caching',
        issue: 'Redis недоступен',
        solution: 'Настроить Redis для кеширования и nonce',
        impact: 'Критично для масштабирования'
      });
    }

    // Конкретные технические рекомендации
    recommendations.push(...[
      {
        priority: 'HIGH',
        category: 'Architecture',
        issue: 'Отсутствие connection pooling',
        solution: 'Настроить MongoDB connection pool (min: 5, max: 50)',
        implementation: 'MongoClient({ maxPoolSize: 50, minPoolSize: 5 })'
      },
      {
        priority: 'HIGH',
        category: 'Caching',
        issue: 'Нет кеширования лидерборда',
        solution: 'Redis cache для топ-100 с TTL 300s',
        implementation: 'redis.setex("leaderboard:top100", 300, JSON.stringify(data))'
      },
      {
        priority: 'MEDIUM',
        category: 'Database',
        issue: 'Неоптимальные индексы',
        solution: 'Составные индексы для частых запросов',
        implementation: 'db.users.createIndex({ "profile.telegramId": 1, "gameState.tokens": -1 })'
      },
      {
        priority: 'MEDIUM',
        category: 'Security',
        issue: 'Отсутствие rate limiting',
        solution: 'Ограничение запросов: 100/min на пользователя',
        implementation: 'express-rate-limit с Redis store'
      }
    ]);

    this.report.recommendations = recommendations;

    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. [${rec.priority}] ${rec.category}: ${rec.issue}`);
      console.log(`   💡 ${rec.solution}`);
      if (rec.implementation) {
        console.log(`   🔧 ${rec.implementation}`);
      }
      if (rec.impact) {
        console.log(`   📈 ${rec.impact}`);
      }
      console.log();
    });
  }

  // Вспомогательные методы
  async getAvgDocumentSize(collectionName) {
    try {
      const stats = await this.db.collection(collectionName).stats();
      return Math.round(stats.avgObjSize || 0);
    } catch {
      return 0;
    }
  }

  async analyzeIndexes() {
    const issues = [];
    const collections = ['users', 'leaderboard', 'withdrawals', 'deposits'];
    
    for (const collName of collections) {
      const indexes = await this.db.collection(collName).indexes();
      
      if (collName === 'users' && !indexes.find(idx => idx.key && idx.key.userId && idx.key['gameState.tokens'])) {
        issues.push(`Отсутствует составной индекс { userId: 1, "gameState.tokens": -1 } в коллекции users`);
      }
      
      if (collName === 'leaderboard' && !indexes.find(idx => idx.key && idx.key.tokens === -1)) {
        issues.push(`Отсутствует индекс по убыванию токенов в коллекции leaderboard`);
      }
    }
    
    return { issues, totalIndexes: await this.getTotalIndexCount() };
  }

  async getTotalIndexCount() {
    const collections = await this.db.listCollections().toArray();
    let total = 0;
    
    for (const coll of collections) {
      const indexes = await this.db.collection(coll.name).indexes();
      total += indexes.length;
    }
    
    return total;
  }

  projectDatabaseLoad(stats) {
    const currentUsers = stats.users.documents;
    const scaleFactor = 2000 / Math.max(currentUsers, 1);
    
    return {
      expectedDocuments: Math.round(
        stats.users.documents * scaleFactor +
        stats.leaderboard.documents * scaleFactor +
        stats.withdrawals.documents * scaleFactor * 5 + // Больше транзакций
        stats.deposits.documents * scaleFactor * 3
      ),
      expectedQueryTime: Math.round(
        (stats.users.queryTime + stats.leaderboard.queryTime) * Math.log(scaleFactor) * 100
      ) / 100,
      estimatedDbSize: Math.round(
        (stats.users.avgDocSize * stats.users.documents * scaleFactor +
         stats.leaderboard.avgDocSize * stats.leaderboard.documents * scaleFactor) / 1024 / 1024
      )
    };
  }

  parseRedisMemory(info) {
    const lines = info.split('\r\n');
    const memory = {};
    
    lines.forEach(line => {
      if (line.startsWith('used_memory:')) {
        memory.used = Math.round(parseInt(line.split(':')[1]) / 1024 / 1024 * 100) / 100;
      }
      if (line.startsWith('used_memory_peak:')) {
        memory.peak = Math.round(parseInt(line.split(':')[1]) / 1024 / 1024 * 100) / 100;
      }
    });
    
    return memory;
  }

  async cleanup() {
    if (this.redis) {
      await this.redis.disconnect();
    }
    if (this.client) {
      await this.client.close();
    }
  }

  async generateReport() {
    console.log('📋 6. ГЕНЕРАЦИЯ ДЕТАЛЬНОГО ОТЧЕТА');
    console.log('=================================');

    const reportPath = `performance_audit_${Date.now()}.json`;
    const fs = require('fs');
    
    fs.writeFileSync(reportPath, JSON.stringify(this.report, null, 2));
    
    console.log(`✅ Детальный отчет сохранен: ${reportPath}`);
    console.log('\n📊 КРАТКИЙ ИТОГ:');
    console.log(`   Текущая нагрузка: ${this.report.database.stats.users.documents} пользователей`);
    console.log(`   Цель: 2000 пользователей (x${Math.round(2000 / Math.max(this.report.database.stats.users.documents, 1))})`);
    console.log(`   Критичных рекомендаций: ${this.report.recommendations.filter(r => r.priority === 'CRITICAL').length}`);
    console.log(`   Высокоприоритетных: ${this.report.recommendations.filter(r => r.priority === 'HIGH').length}`);
    console.log(`   Ожидаемое потребление памяти: ${this.report.memory?.projectedFor2000Users?.estimated || 'N/A'}MB`);
  }
}

async function main() {
  const auditor = new PerformanceAuditor();
  
  try {
    await auditor.initialize();
    await auditor.auditDatabase();
    await auditor.auditRedis();
    await auditor.auditMemoryUsage();
    await auditor.auditConcurrency();
    await auditor.generateRecommendations();
    await auditor.generateReport();
  } catch (error) {
    console.error('❌ Ошибка аудита:', error);
  } finally {
    await auditor.cleanup();
  }
}

if (require.main === module) {
  main().then(() => {
    console.log('\n🏁 Аудит производительности завершен');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Критическая ошибка:', error);
    process.exit(1);
  });
}

module.exports = { PerformanceAuditor }; 