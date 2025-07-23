#!/usr/bin/env node

require('dotenv').config({ path: './backend/.env' });

const databaseConfig = require('../backend/config/database');
const cacheService = require('../backend/services/cacheService');
const { performance } = require('perf_hooks');

class OptimizationTester {
  constructor() {
    this.results = {
      database: {},
      cache: {},
      performance: {},
      summary: {}
    };
  }

  async initialize() {
    console.log('🧪 ТЕСТИРОВАНИЕ ОПТИМИЗАЦИЙ TAPDEL');
    console.log('==================================');
    console.log('🎯 Цель: Проверка готовности к 2000 пользователям\n');

    try {
      // Инициализируем компоненты
      await databaseConfig.connect();
      await cacheService.initialize();
      
      console.log('✅ Все компоненты инициализированы\n');
      return true;
    } catch (error) {
      console.error('❌ Ошибка инициализации:', error);
      return false;
    }
  }

  async testDatabase() {
    console.log('📊 1. ТЕСТИРОВАНИЕ БАЗЫ ДАННЫХ');
    console.log('===============================');

    const start = performance.now();

    try {
      // Тест подключения и индексов
      const health = await databaseConfig.healthCheck();
      const stats = await databaseConfig.getStats();

      // Тест скорости основных операций
      const operationTests = await this.testDatabaseOperations();

      this.results.database = {
        health: health.healthy,
        responseTime: health.responseTime,
        stats: stats,
        operations: operationTests,
        testTime: Math.round((performance.now() - start) * 100) / 100
      };

      console.log(`✅ MongoDB здоровье: ${health.healthy ? 'OK' : 'FAILED'}`);
      console.log(`⚡ Время отклика: ${health.responseTime}ms`);
      console.log(`🔗 Активные соединения: ${stats?.connections?.current || 'N/A'}`);
      console.log(`📈 Операции/сек: ${operationTests.throughput}`);
      console.log();

    } catch (error) {
      console.error('❌ Ошибка тестирования БД:', error);
      this.results.database.error = error.message;
    }
  }

  async testDatabaseOperations() {
    const operations = [];
    const testCount = 100;
    
    console.log(`🔬 Тестирование ${testCount} операций...`);

    const start = performance.now();

    // Параллельные операции
    for (let i = 0; i < testCount; i++) {
      operations.push(
        databaseConfig.getCollection('users').updateOne(
          { userId: `test-opt-${i}` },
          { 
            $inc: { 'gameState.tokens': 1 },
            $set: { 'gameState.lastSaved': new Date() }
          },
          { upsert: true }
        )
      );
    }

    const results = await Promise.allSettled(operations);
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const totalTime = performance.now() - start;

    // Очистка тестовых данных
    await databaseConfig.getCollection('users').deleteMany({
      userId: { $regex: /^test-opt-/ }
    });

    return {
      total: testCount,
      successful: successCount,
      failed: testCount - successCount,
      totalTime: Math.round(totalTime * 100) / 100,
      avgTime: Math.round(totalTime / testCount * 100) / 100,
      throughput: Math.round(successCount / (totalTime / 1000))
    };
  }

  async testCache() {
    console.log('🔄 2. ТЕСТИРОВАНИЕ КЕШИРОВАНИЯ');
    console.log('===============================');

    const start = performance.now();

    try {
      // Тест Redis подключения
      const connected = cacheService.isConnected;
      
      if (!connected) {
        console.log('⚠️ Redis недоступен, тестируем локальный кеш');
      }

      // Тест производительности кеша
      const cachePerformance = await this.testCacheOperations();

      // Тест специализированных методов
      const specializedTests = await this.testSpecializedCache();

      this.results.cache = {
        connected,
        performance: cachePerformance,
        specialized: specializedTests,
        stats: cacheService.getStats(),
        testTime: Math.round((performance.now() - start) * 100) / 100
      };

      console.log(`✅ Redis подключение: ${connected ? 'OK' : 'LOCAL ONLY'}`);
      console.log(`⚡ Операции кеша/сек: ${cachePerformance.throughput}`);
      console.log(`📈 Hit rate: ${this.results.cache.stats.hitRate}`);
      console.log();

    } catch (error) {
      console.error('❌ Ошибка тестирования кеша:', error);
      this.results.cache.error = error.message;
    }
  }

  async testCacheOperations() {
    const testCount = 200;
    const testData = { test: 'data', timestamp: Date.now() };

    console.log(`🔬 Тестирование ${testCount} операций кеша...`);

    const start = performance.now();

    // Тест записи
    const writePromises = [];
    for (let i = 0; i < testCount; i++) {
      writePromises.push(
        cacheService.set(`test:cache:${i}`, { ...testData, id: i }, 60)
      );
    }

    await Promise.allSettled(writePromises);
    const writeTime = performance.now() - start;

    // Тест чтения
    const readStart = performance.now();
    const readPromises = [];
    for (let i = 0; i < testCount; i++) {
      readPromises.push(
        cacheService.get(`test:cache:${i}`)
      );
    }

    const readResults = await Promise.allSettled(readPromises);
    const readTime = performance.now() - readStart;

    // Очистка
    for (let i = 0; i < testCount; i++) {
      await cacheService.del(`test:cache:${i}`);
    }

    const successfulReads = readResults.filter(r => r.status === 'fulfilled' && r.value).length;

    return {
      writes: {
        total: testCount,
        time: Math.round(writeTime * 100) / 100,
        throughput: Math.round(testCount / (writeTime / 1000))
      },
      reads: {
        total: testCount,
        successful: successfulReads,
        time: Math.round(readTime * 100) / 100,
        throughput: Math.round(successfulReads / (readTime / 1000))
      },
      overall: {
        throughput: Math.round((testCount * 2) / ((writeTime + readTime) / 1000))
      }
    };
  }

  async testSpecializedCache() {
    console.log('🎯 Тестирование специализированных методов кеша...');

    const tests = {};

    // Тест кеша лидерборда
    const leaderboardStart = performance.now();
    const leaderboard1 = await cacheService.getLeaderboard(1, 50);
    const leaderboard2 = await cacheService.getLeaderboard(1, 50); // Должен быть из кеша
    const leaderboardTime = performance.now() - leaderboardStart;

    tests.leaderboard = {
      firstCall: leaderboard1.length,
      secondCall: leaderboard2.length,
      cached: leaderboard1.length === leaderboard2.length,
      time: Math.round(leaderboardTime * 100) / 100
    };

    // Тест кеша профилей
    const profileStart = performance.now();
    const profile1 = await cacheService.getUserProfile('telegram-12345');
    const profile2 = await cacheService.getUserProfile('telegram-12345'); // Должен быть из кеша
    const profileTime = performance.now() - profileStart;

    tests.profile = {
      found: !!profile1,
      cached: JSON.stringify(profile1) === JSON.stringify(profile2),
      time: Math.round(profileTime * 100) / 100
    };

    return tests;
  }

  async testConcurrency() {
    console.log('⚡ 3. ТЕСТИРОВАНИЕ КОНКУРЕНТНОСТИ');
    console.log('==================================');

    const start = performance.now();

    try {
      // Симуляция 100 одновременных пользователей
      const concurrentUsers = 100;
      const operations = [];

      console.log(`🎭 Симуляция ${concurrentUsers} одновременных пользователей...`);

      // Создаем разнообразные операции
      for (let i = 0; i < concurrentUsers; i++) {
        const userId = `concurrent-test-${i}`;
        
        operations.push(
          // Обновление токенов
          databaseConfig.getCollection('users').updateOne(
            { userId },
            { 
              $inc: { 'gameState.tokens': Math.floor(Math.random() * 100) },
              $set: { 'gameState.lastSaved': new Date() }
            },
            { upsert: true }
          ),
          
          // Кеширование профиля
          cacheService.getUserProfile(userId),
          
          // Запрос лидерборда
          cacheService.getLeaderboard(Math.floor(Math.random() * 5) + 1, 20)
        );
      }

      const results = await Promise.allSettled(operations);
      const totalTime = performance.now() - start;

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.length - successful;

      // Очистка
      await databaseConfig.getCollection('users').deleteMany({
        userId: { $regex: /^concurrent-test-/ }
      });

      this.results.performance = {
        concurrentUsers,
        totalOperations: operations.length,
        successful,
        failed,
        totalTime: Math.round(totalTime * 100) / 100,
        throughput: Math.round(successful / (totalTime / 1000)),
        avgResponseTime: Math.round(totalTime / operations.length * 100) / 100
      };

      console.log(`✅ Успешных операций: ${successful}/${operations.length}`);
      console.log(`⚡ Общий throughput: ${this.results.performance.throughput} ops/sec`);
      console.log(`📊 Среднее время ответа: ${this.results.performance.avgResponseTime}ms`);
      console.log();

    } catch (error) {
      console.error('❌ Ошибка тестирования конкурентности:', error);
      this.results.performance.error = error.message;
    }
  }

  async testScalabilityProjection() {
    console.log('📈 4. ПРОЕКЦИЯ МАСШТАБИРУЕМОСТИ');
    console.log('===============================');

    // Расчеты на основе тестов
    const dbThroughput = this.results.database?.operations?.throughput || 0;
    const cacheThroughput = this.results.cache?.performance?.overall?.throughput || 0;
    const concurrentThroughput = this.results.performance?.throughput || 0;

    // Предположения для расчетов
    const avgRequestsPerUserPerMinute = 50; // Активная игра
    const targetUsers = 2000;
    const expectedLoad = targetUsers * avgRequestsPerUserPerMinute / 60; // requests/sec

    const projections = {
      expectedLoad,
      databaseCapacity: dbThroughput,
      cacheCapacity: cacheThroughput,
      concurrentCapacity: concurrentThroughput,
      databaseUtilization: Math.round(expectedLoad / dbThroughput * 100),
      cacheUtilization: cacheThroughput > 0 ? Math.round(expectedLoad / cacheThroughput * 100) : 'N/A',
      recommendations: []
    };

    // Анализ и рекомендации
    if (projections.databaseUtilization > 80) {
      projections.recommendations.push('КРИТИЧНО: Увеличить connection pool или оптимизировать запросы');
    } else if (projections.databaseUtilization > 60) {
      projections.recommendations.push('ВНИМАНИЕ: Мониторить нагрузку на базу данных');
    } else {
      projections.recommendations.push('БД: Готова к нагрузке');
    }

    if (cacheThroughput === 0) {
      projections.recommendations.push('КРИТИЧНО: Настроить Redis для кеширования');
    } else if (typeof projections.cacheUtilization === 'number' && projections.cacheUtilization > 70) {
      projections.recommendations.push('ВНИМАНИЕ: Оптимизировать стратегию кеширования');
    } else {
      projections.recommendations.push('КЕШ: Готов к нагрузке');
    }

    this.results.summary = projections;

    console.log(`🎯 Ожидаемая нагрузка: ${expectedLoad.toFixed(1)} req/sec`);
    console.log(`📊 Пропускная способность БД: ${dbThroughput} ops/sec (${projections.databaseUtilization}% загрузка)`);
    console.log(`🔄 Пропускная способность кеша: ${cacheThroughput} ops/sec`);
    console.log(`⚡ Конкурентная обработка: ${concurrentThroughput} ops/sec`);
    console.log();

    console.log('💡 РЕКОМЕНДАЦИИ:');
    projections.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
    console.log();
  }

  async generateReport() {
    console.log('📋 5. ИТОГОВЫЙ ОТЧЕТ');
    console.log('====================');

    const report = {
      timestamp: new Date(),
      summary: this.results.summary,
      readiness: {
        database: this.results.database?.health && this.results.database?.operations?.throughput > 500,
        cache: this.results.cache?.connected || this.results.cache?.performance?.overall?.throughput > 0,
        performance: this.results.performance?.throughput > 200
      },
      details: this.results
    };

    // Сохраняем отчет
    const fs = require('fs');
    const reportPath = `optimization_test_${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    const readyComponents = Object.values(report.readiness).filter(Boolean).length;
    const totalComponents = Object.keys(report.readiness).length;

    console.log(`📊 ГОТОВНОСТЬ К 2000 ПОЛЬЗОВАТЕЛЕЙ: ${readyComponents}/${totalComponents} компонентов`);
    console.log();

    Object.entries(report.readiness).forEach(([component, ready]) => {
      console.log(`   ${ready ? '✅' : '❌'} ${component.toUpperCase()}: ${ready ? 'ГОТОВ' : 'ТРЕБУЕТ ДОРАБОТКИ'}`);
    });

    console.log();
    console.log(`📁 Детальный отчет сохранен: ${reportPath}`);

    // Финальная оценка
    if (readyComponents === totalComponents) {
      console.log('🎉 СИСТЕМА ГОТОВА К МАСШТАБИРОВАНИЮ НА 2000 ПОЛЬЗОВАТЕЛЕЙ!');
    } else if (readyComponents >= totalComponents * 0.8) {
      console.log('⚠️ Система почти готова, требуются незначительные доработки');
    } else {
      console.log('🚨 Система требует серьезных оптимизаций перед масштабированием');
    }

    return report;
  }

  async cleanup() {
    try {
      // Очистка тестовых данных
      await databaseConfig.getCollection('users').deleteMany({
        userId: { $regex: /^(test-|concurrent-)/ }
      });

      await cacheService.disconnect();
      await databaseConfig.disconnect();

      console.log('\n🧹 Очистка завершена');
    } catch (error) {
      console.error('Ошибка очистки:', error);
    }
  }
}

async function main() {
  const tester = new OptimizationTester();

  try {
    const initialized = await tester.initialize();
    if (!initialized) {
      process.exit(1);
    }

    await tester.testDatabase();
    await tester.testCache();
    await tester.testConcurrency();
    await tester.testScalabilityProjection();
    await tester.generateReport();

  } catch (error) {
    console.error('💥 Критическая ошибка тестирования:', error);
  } finally {
    await tester.cleanup();
  }
}

if (require.main === module) {
  main().then(() => {
    console.log('\n🏁 Тестирование оптимизаций завершено');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Фатальная ошибка:', error);
    process.exit(1);
  });
}

module.exports = { OptimizationTester }; 