const redis = require('redis');
const config = require('../config/decimal');

async function testRedis() {
  console.log('🔍 Тестирование Redis подключения...');
  console.log('📋 Конфигурация:');
  console.log(`   URL: ${config.REDIS_URL}`);
  console.log(`   Upstash: ${config.isUpstash()}`);
  
  try {
    const redisConfig = config.getRedisConfig();
    console.log('🔗 Создаем Redis клиент...');
    console.log('   Конфигурация:', JSON.stringify(redisConfig, null, 2));
    
    const client = redis.createClient(redisConfig);
    
    client.on('error', (err) => {
      console.error('❌ Redis ошибка:', err);
    });
    
    client.on('connect', () => {
      console.log('🔗 Redis подключение установлено');
    });
    
    client.on('ready', () => {
      console.log('✅ Redis готов к работе');
    });
    
    console.log('🔄 Подключаемся...');
    await client.connect();
    
    console.log('📡 Выполняем PING...');
    const pong = await client.ping();
    console.log(`✅ PING ответ: ${pong}`);
    
    console.log('📝 Тестируем SET/GET...');
    await client.set('test:key', 'test:value');
    const value = await client.get('test:key');
    console.log(`✅ SET/GET работает: ${value}`);
    
    console.log('🧹 Очищаем тестовые данные...');
    await client.del('test:key');
    
    console.log('🔌 Отключаемся...');
    await client.disconnect();
    
    console.log('🎉 Тест Redis успешно завершен!');
    
  } catch (error) {
    console.error('❌ Ошибка тестирования Redis:', error);
    console.error('📋 Детали:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Запускаем тест
testRedis(); 