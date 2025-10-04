const redisConfig = require('../config/redis');
const supabaseService = require('../services/supabaseService');
const cacheService = require('../services/cacheService');
require('dotenv').config();

async function checkNewServices() {
  console.log('🔍 Проверка новых сервисов Redis и Supabase');
  console.log('=' .repeat(50));
  
  const results = {
    redis: false,
    supabase: false,
    cache: false
  };
  
  try {
    // 1. Проверка Redis
    console.log('\n1️⃣ ПРОВЕРКА REDIS');
    console.log('-'.repeat(30));
    
    if (redisConfig.isConfigured()) {
      console.log('✅ Redis конфигурация найдена');
      console.log(`   Провайдер: ${redisConfig.getProviderType()}`);
      console.log(`   URL маска: ${process.env.REDIS_URL?.replace(/\/\/.*@/, '//***:***@') || 'не установлен'}`);
      
      try {
        await cacheService.initialize();
        if (cacheService.isConnected) {
          console.log('✅ Redis подключение успешно');
          results.redis = true;
        } else {
          console.log('⚠️ Redis недоступен, но локальный кеш работает');
          results.redis = false;
        }
      } catch (error) {
        console.log('❌ Ошибка подключения к Redis:', error.message);
        results.redis = false;
      }
    } else {
      console.log('❌ Redis конфигурация не найдена');
      console.log('   Установите переменную REDIS_URL в Vercel');
    }
    
    // 2. Проверка Supabase
    console.log('\n2️⃣ ПРОВЕРКА SUPABASE');
    console.log('-'.repeat(30));
    
    if (supabaseService.config.isConfigured()) {
      console.log('✅ Supabase конфигурация найдена');
      console.log(`   URL: ${supabaseService.config.supabaseUrl}`);
      console.log(`   Anon Key: ${supabaseService.config.supabaseKey ? 'установлен' : 'не установлен'}`);
      console.log(`   Service Key: ${supabaseService.config.supabaseServiceKey ? 'установлен' : 'не установлен'}`);
      
      try {
        await supabaseService.initialize();
        console.log('✅ Supabase подключение успешно');
        results.supabase = true;
      } catch (error) {
        console.log('❌ Ошибка подключения к Supabase:', error.message);
        results.supabase = false;
      }
    } else {
      console.log('❌ Supabase конфигурация не найдена');
      console.log('   Установите переменные SUPABASE_URL и SUPABASE_ANON_KEY в Vercel');
    }
    
    // 3. Проверка Cache Service
    console.log('\n3️⃣ ПРОВЕРКА CACHE SERVICE');
    console.log('-'.repeat(30));
    
    try {
      const stats = cacheService.getStats();
      console.log('📊 Статистика Cache Service:');
      console.log(`   Подключен: ${stats.isConnected ? 'Да' : 'Нет'}`);
      console.log(`   Локальный кеш: ${stats.localCacheSize} элементов`);
      console.log(`   Hits: ${stats.stats.hits}`);
      console.log(`   Misses: ${stats.stats.misses}`);
      console.log(`   Errors: ${stats.stats.errors}`);
      
      results.cache = true;
    } catch (error) {
      console.log('❌ Ошибка Cache Service:', error.message);
      results.cache = false;
    }
    
    // 4. Тестирование операций
    console.log('\n4️⃣ ТЕСТИРОВАНИЕ ОПЕРАЦИЙ');
    console.log('-'.repeat(30));
    
    if (results.redis) {
      console.log('🧪 Тестирование Redis операций...');
      try {
        await cacheService.set('test_key', { message: 'Hello Redis!', timestamp: new Date() }, 60);
        const testData = await cacheService.get('test_key');
        if (testData && testData.message === 'Hello Redis!') {
          console.log('✅ Redis операции работают');
        } else {
          console.log('❌ Redis операции не работают');
        }
        await cacheService.del('test_key');
      } catch (error) {
        console.log('❌ Ошибка тестирования Redis:', error.message);
      }
    }
    
    if (results.supabase) {
      console.log('🧪 Тестирование Supabase операций...');
      try {
        const stats = await supabaseService.getStatistics();
        console.log('📊 Статистика Supabase:');
        console.log(`   Пользователи: ${stats.totalUsers}`);
        console.log(`   Лидерборд: ${stats.totalLeaderboard}`);
        console.log(`   Депозиты: ${stats.totalDeposits}`);
        console.log(`   Выводы: ${stats.totalWithdrawals}`);
        console.log('✅ Supabase операции работают');
      } catch (error) {
        console.log('❌ Ошибка тестирования Supabase:', error.message);
      }
    }
    
    // 5. Итоговый отчет
    console.log('\n📊 ИТОГОВЫЙ ОТЧЕТ');
    console.log('=' .repeat(50));
    
    console.log(`Redis: ${results.redis ? '✅ OK' : '❌ ОШИБКА'}`);
    console.log(`Supabase: ${results.supabase ? '✅ OK' : '❌ ОШИБКА'}`);
    console.log(`Cache Service: ${results.cache ? '✅ OK' : '❌ ОШИБКА'}`);
    
    const successCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;
    
    if (successCount === totalCount) {
      console.log('\n🎉 ВСЕ СЕРВИСЫ РАБОТАЮТ!');
      console.log('\n📋 Следующие шаги:');
      console.log('1. Запустите миграцию: npm run migrate:supabase');
      console.log('2. Обновите API для работы с Supabase');
      console.log('3. Протестируйте полную систему');
    } else {
      console.log('\n⚠️ НЕКОТОРЫЕ СЕРВИСЫ ТРЕБУЮТ НАСТРОЙКИ');
      console.log('\n🔧 Рекомендации:');
      if (!results.redis) {
        console.log('- Проверьте переменную REDIS_URL в Vercel');
        console.log('- Убедитесь, что Redis сервис активен');
      }
      if (!results.supabase) {
        console.log('- Проверьте переменные SUPABASE_URL и SUPABASE_ANON_KEY в Vercel');
        console.log('- Убедитесь, что Supabase проект активен');
      }
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка при проверке сервисов:', error);
    throw error;
  }
}

// Запуск проверки
if (require.main === module) {
  checkNewServices()
    .then(() => {
      console.log('\n✅ Проверка сервисов завершена');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Проверка сервисов завершилась с ошибкой:', error);
      process.exit(1);
    });
}

module.exports = { checkNewServices };
