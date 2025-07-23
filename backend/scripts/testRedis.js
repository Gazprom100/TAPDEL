const redis = require('redis');
const config = require('../config/decimal');

async function testRedisConnection() {
  console.log('🧪 Тестирование Redis подключения...');
  console.log(`📋 REDIS_URL: ${config.REDIS_URL}`);
  
  try {
    // Получаем конфигурацию Redis
    const redisConfig = config.getRedisConfig();
    console.log('🔧 Конфигурация Redis:', JSON.stringify(redisConfig, null, 2));
    
    // Создаем клиент Redis
    const client = redis.createClient(redisConfig);
    
    // Обработка событий
    client.on('connect', () => {
      console.log('✅ Redis: Подключение установлено');
    });
    
    client.on('ready', () => {
      console.log('✅ Redis: Клиент готов к работе');
    });
    
    client.on('error', (err) => {
      console.error('❌ Redis ошибка:', err);
    });
    
    client.on('end', () => {
      console.log('🔌 Redis: Подключение закрыто');
    });
    
    // Подключаемся с timeout
    console.log('🔗 Подключаемся к Redis...');
    const connectPromise = client.connect();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Redis connection timeout')), 15000)
    );
    
    await Promise.race([connectPromise, timeoutPromise]);
    console.log('✅ Redis: Успешно подключились');
    
    // Тестируем ping
    console.log('🏓 Тестируем ping...');
    const pong = await client.ping();
    console.log(`✅ Redis ping: ${pong}`);
    
    // Тестируем запись/чтение
    console.log('📝 Тестируем запись/чтение...');
    const testKey = 'test_redis_connection';
    const testValue = `test_${Date.now()}`;
    
    await client.set(testKey, testValue);
    console.log(`✅ Записано: ${testKey} = ${testValue}`);
    
    const readValue = await client.get(testKey);
    console.log(`✅ Прочитано: ${testKey} = ${readValue}`);
    
    // Удаляем тестовый ключ
    await client.del(testKey);
    console.log(`✅ Удален тестовый ключ: ${testKey}`);
    
    // Тестируем специфичные для DecimalChain ключи
    console.log('🔑 Тестируем DecimalChain ключи...');
    const nonceKey = 'DECIMAL_NONCE_test_address';
    await client.set(nonceKey, '123');
    const nonceValue = await client.get(nonceKey);
    console.log(`✅ Nonce тест: ${nonceKey} = ${nonceValue}`);
    
    const blockKey = 'DECIMAL_LAST_BLOCK';
    await client.set(blockKey, '1000');
    const blockValue = await client.get(blockKey);
    console.log(`✅ Block тест: ${blockKey} = ${blockValue}`);
    
    // Очищаем тестовые ключи
    await client.del(nonceKey, blockKey);
    console.log('✅ Очищены тестовые ключи');
    
    // Закрываем подключение
    await client.quit();
    console.log('✅ Redis тест завершен успешно');
    
    return true;
    
  } catch (error) {
    console.error('❌ Ошибка тестирования Redis:', error);
    console.error('📋 Детали ошибки:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    // Дополнительная диагностика
    console.log('\n🔍 Дополнительная диагностика:');
    console.log(`   REDIS_URL установлен: ${!!config.REDIS_URL}`);
    console.log(`   Upstash: ${config.isUpstash()}`);
    console.log(`   Конфигурация готова: ${config.isConfigured()}`);
    
    return false;
  }
}

// Запускаем тест если скрипт вызван напрямую
if (require.main === module) {
  testRedisConnection()
    .then(success => {
      if (success) {
        console.log('\n🎉 Redis тест прошел успешно!');
        process.exit(0);
      } else {
        console.log('\n💥 Redis тест провалился!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Неожиданная ошибка:', error);
      process.exit(1);
    });
}

module.exports = { testRedisConnection }; 