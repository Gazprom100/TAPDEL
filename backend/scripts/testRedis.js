const redis = require('redis');
require('dotenv').config({ path: './.env' });

const config = {
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379/0'
};

async function testRedis() {
  console.log('🔧 Тестирование подключения к Redis...');
  console.log(`📋 Redis URL: ${config.REDIS_URL.replace(/:[^:@]*@/, ':****@')}`);
  
  try {
    const client = redis.createClient({
      url: config.REDIS_URL,
      socket: {
        connectTimeout: 10000,
        tls: false
      },
      connectTimeout: 10000,
      lazyConnect: true,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    console.log('🔗 Подключение к Redis...');
    await client.connect();
    console.log('✅ Redis подключен');
    
    const pong = await client.ping();
    console.log(`🏓 Redis ping: ${pong}`);
    
    // Тестируем запись и чтение
    await client.set('test_key', 'test_value');
    const value = await client.get('test_key');
    console.log(`📝 Тест записи/чтения: ${value}`);
    
    // Проверяем ключи DecimalService
    const lastBlock = await client.get('DECIMAL_LAST_BLOCK');
    const currentBlock = await client.get('DECIMAL_CURRENT_BLOCK');
    console.log(`📊 DECIMAL_LAST_BLOCK: ${lastBlock}`);
    console.log(`📊 DECIMAL_CURRENT_BLOCK: ${currentBlock}`);
    
    await client.disconnect();
    console.log('✅ Redis тест завершен успешно');
    
  } catch (error) {
    console.error('❌ Ошибка подключения к Redis:', error);
    console.error('📋 Детали ошибки:', {
      message: error.message,
      code: error.code,
      syscall: error.syscall
    });
  }
}

testRedis(); 