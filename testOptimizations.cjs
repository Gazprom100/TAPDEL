#!/usr/bin/env node

require('dotenv').config({ path: './backend/.env' });

const { MongoClient } = require('mongodb');
const { performance } = require('perf_hooks');

const MONGODB_URI = process.env.MONGODB_URI || 
  'mongodb+srv://TAPDEL:fpz%25sE62KPzmHfM@cluster0.ejo8obw.mongodb.net/tapdel?retryWrites=true&w=majority&appName=Cluster0';

async function testOptimizations() {
  console.log('🧪 УПРОЩЕННЫЙ ТЕСТ ОПТИМИЗАЦИЙ TAPDEL');
  console.log('=====================================');
  console.log('🎯 Цель: Проверка готовности к 2000 пользователям\n');

  let client;

  try {
    // Подключение к MongoDB с оптимизированными настройками
    console.log('📊 1. ТЕСТИРОВАНИЕ MONGODB');
    console.log('===========================');

    const start = performance.now();

    client = new MongoClient(MONGODB_URI, {
      maxPoolSize: 50,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
      retryWrites: true,
      writeConcern: { w: 'majority', j: true }
    });

    await client.connect();
    const db = client.db('tapdel');
    
    const connectTime = performance.now() - start;
    console.log(`✅ MongoDB подключен: ${connectTime.toFixed(2)}ms`);

    // Проверка индексов
    const users = db.collection('users');
    const indexes = await users.indexes();
    console.log(`📚 Индексов в коллекции users: ${indexes.length}`);

    // Тест производительности операций
    console.log('\n🔬 Тестирование производительности операций...');
    
    const testCount = 100;
    const operations = [];
    
    const opStart = performance.now();
    
    for (let i = 0; i < testCount; i++) {
      operations.push(
        users.updateOne(
          { userId: `perf-test-${i}` },
          { 
            $inc: { 'gameState.tokens': 1 },
            $set: { 'gameState.lastSaved': new Date() }
          },
          { upsert: true }
        )
      );
    }

    const results = await Promise.allSettled(operations);
    const opTime = performance.now() - opStart;
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const throughput = Math.round(successful / (opTime / 1000));

    console.log(`✅ Операций выполнено: ${successful}/${testCount}`);
    console.log(`⚡ Время выполнения: ${opTime.toFixed(2)}ms`);
    console.log(`📈 Throughput: ${throughput} ops/sec`);

    // Очистка тестовых данных
    await users.deleteMany({ userId: { $regex: /^perf-test-/ } });

    // Тест лидерборда
    console.log('\n📊 Тестирование лидерборда...');
    const leaderStart = performance.now();
    
    const leaderboard = await db.collection('leaderboard')
      .find({}, { projection: { username: 1, tokens: 1, rank: 1 } })
      .sort({ tokens: -1 })
      .limit(50)
      .toArray();
    
    const leaderTime = performance.now() - leaderStart;
    console.log(`📋 Записей лидерборда: ${leaderboard.length}`);
    console.log(`⚡ Время загрузки: ${leaderTime.toFixed(2)}ms`);

    // Проекция на 2000 пользователей
    console.log('\n📈 2. ПРОЕКЦИЯ МАСШТАБИРУЕМОСТИ');
    console.log('===============================');

    const avgRequestsPerUserPerMinute = 50; // Активная игра
    const targetUsers = 2000;
    const expectedLoad = targetUsers * avgRequestsPerUserPerMinute / 60; // requests/sec

    const databaseUtilization = Math.round(expectedLoad / throughput * 100);

    console.log(`🎯 Ожидаемая нагрузка: ${expectedLoad.toFixed(1)} req/sec`);
    console.log(`📊 Пропускная способность БД: ${throughput} ops/sec`);
    console.log(`📈 Загрузка БД: ${databaseUtilization}%`);

    // Рекомендации
    console.log('\n💡 3. РЕКОМЕНДАЦИИ');
    console.log('==================');

    const recommendations = [];

    if (databaseUtilization > 80) {
      recommendations.push('🚨 КРИТИЧНО: Увеличить connection pool или оптимизировать запросы');
    } else if (databaseUtilization > 60) {
      recommendations.push('⚠️ ВНИМАНИЕ: Мониторить нагрузку на базу данных');
    } else {
      recommendations.push('✅ БД: Готова к нагрузке');
    }

    if (leaderTime > 50) {
      recommendations.push('🚨 КРИТИЧНО: Необходимо кеширование лидерборда');
    } else {
      recommendations.push('✅ ЛИДЕРБОРД: Производительность в норме');
    }

    recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });

    // Итоговая оценка
    console.log('\n🏁 4. ИТОГОВАЯ ОЦЕНКА');
    console.log('=====================');

    const readiness = {
      database: throughput > 500 && databaseUtilization < 80,
      leaderboard: leaderTime < 50,
      operations: successful === testCount
    };

    const readyComponents = Object.values(readiness).filter(Boolean).length;
    const totalComponents = Object.keys(readiness).length;

    console.log(`📊 ГОТОВНОСТЬ: ${readyComponents}/${totalComponents} компонентов`);

    Object.entries(readiness).forEach(([component, ready]) => {
      console.log(`   ${ready ? '✅' : '❌'} ${component.toUpperCase()}: ${ready ? 'ГОТОВ' : 'ТРЕБУЕТ ДОРАБОТКИ'}`);
    });

    if (readyComponents === totalComponents) {
      console.log('\n🎉 СИСТЕМА ГОТОВА К МАСШТАБИРОВАНИЮ НА 2000 ПОЛЬЗОВАТЕЛЕЙ!');
    } else if (readyComponents >= totalComponents * 0.8) {
      console.log('\n⚠️ Система почти готова, требуются незначительные доработки');
    } else {
      console.log('\n🚨 Система требует серьезных оптимизаций перед масштабированием');
    }

    // Сохранение отчета
    const report = {
      timestamp: new Date(),
      performance: {
        database: {
          throughput,
          connectionTime: connectTime,
          operationsSuccessful: successful,
          operationsTotal: testCount
        },
        leaderboard: {
          loadTime: leaderTime,
          recordsCount: leaderboard.length
        }
      },
      scalability: {
        expectedLoad,
        databaseUtilization,
        targetUsers
      },
      readiness,
      recommendations
    };

    const fs = require('fs');
    const reportPath = `optimization_test_${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📁 Детальный отчет сохранен: ${reportPath}`);

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔒 Подключение к MongoDB закрыто');
    }
  }
}

if (require.main === module) {
  testOptimizations().then(() => {
    console.log('\n🏁 Тестирование завершено');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Фатальная ошибка:', error);
    process.exit(1);
  });
} 