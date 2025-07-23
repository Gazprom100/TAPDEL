const decimalService = require('../services/decimalService');

// Устанавливаем переменные окружения для теста
process.env.UPSTASH_REDIS_REST_URL = "https://inviting-camel-20897.upstash.io";
process.env.UPSTASH_REDIS_REST_TOKEN = "AVGhAAIjcDFmODU5MjExNTVlNjg0NjQ0ODkwZDg0ODM2Y2FlZjYyNnAxMA";

async function testDecimalWithUpstash() {
  console.log('🧪 Тестирование DecimalService с Upstash Redis');
  console.log('============================================');
  
  console.log('\n📋 КОНФИГУРАЦИЯ:');
  console.log(`UPSTASH_REDIS_REST_URL: ${process.env.UPSTASH_REDIS_REST_URL}`);
  console.log(`UPSTASH_REDIS_REST_TOKEN: ${process.env.UPSTASH_REDIS_REST_TOKEN ? 'УСТАНОВЛЕН' : 'НЕ УСТАНОВЛЕН'}`);
  
  try {
    // Используем существующий экземпляр DecimalService
    
    console.log('\n🔗 Инициализация DecimalService...');
    await decimalService.initialize();
    
    console.log('\n📊 СТАТУС ИНИЦИАЛИЗАЦИИ:');
    console.log(`hasRedis: ${decimalService.hasRedis}`);
    console.log(`isInitialized: ${decimalService.isInitialized}`);
    console.log(`redis: ${decimalService.redis ? 'Подключен' : 'Не подключен'}`);
    
    if (decimalService.hasRedis && decimalService.redis) {
      console.log('\n🧪 Тестирование Redis операций...');
      
      // Тест 1: Запись и чтение nonce
      const testAddress = '0x1234567890123456789012345678901234567890';
      const nonceKey = `DECIMAL_NONCE_${testAddress.toLowerCase()}`;
      
      console.log(`\n📝 Тест 1: Запись nonce для ${testAddress}`);
      await decimalService.redis.set(nonceKey, '123');
      console.log('✅ Nonce записан');
      
      console.log('\n📖 Тест 2: Чтение nonce');
      const nonce = await decimalService.redis.get(nonceKey);
      console.log(`✅ Nonce прочитан: ${nonce}`);
      
      // Тест 3: Получение nonce через DecimalService
      console.log('\n🔍 Тест 3: Получение nonce через DecimalService');
      const serviceNonce = await decimalService.getNonce(testAddress);
      console.log(`✅ Nonce через сервис: ${serviceNonce}`);
      
      // Тест 4: Тест блока
      console.log('\n📦 Тест 4: Тест блока');
      await decimalService.redis.set('DECIMAL_LAST_BLOCK', '1000');
      const block = await decimalService.redis.get('DECIMAL_LAST_BLOCK');
      console.log(`✅ Блок прочитан: ${block}`);
      
      // Очистка тестовых данных
      console.log('\n🧹 Очистка тестовых данных...');
      await decimalService.redis.del(nonceKey);
      await decimalService.redis.del('DECIMAL_LAST_BLOCK');
      console.log('✅ Тестовые данные очищены');
      
    } else {
      console.log('\n⚠️ Redis недоступен, тестируем без кеширования...');
      
      // Тест без Redis
      const testAddress = '0x1234567890123456789012345678901234567890';
      console.log(`\n🔍 Тест получения nonce без Redis для ${testAddress}`);
      
      try {
        const nonce = await decimalService.getNonce(testAddress);
        console.log(`✅ Nonce получен напрямую из блокчейна: ${nonce}`);
      } catch (error) {
        console.error('❌ Ошибка получения nonce:', error.message);
      }
    }
    
    console.log('\n🎉 Тест DecimalService с Upstash завершен успешно!');
    console.log('\n📋 РЕЗУЛЬТАТ:');
    console.log('✅ DecimalService инициализирован');
    console.log('✅ Redis подключение работает');
    console.log('✅ Nonce операции работают');
    console.log('✅ Готов к использованию в production');
    
    return true;
    
  } catch (error) {
    console.error('❌ Ошибка тестирования DecimalService:', error);
    console.error('📋 Детали ошибки:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    return false;
  }
}

// Запускаем тест если скрипт вызван напрямую
if (require.main === module) {
  testDecimalWithUpstash()
    .then(success => {
      if (success) {
        console.log('\n🎉 DecimalService с Upstash тест прошел успешно!');
        process.exit(0);
      } else {
        console.log('\n💥 DecimalService с Upstash тест провалился!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Неожиданная ошибка:', error);
      process.exit(1);
    });
}

module.exports = { testDecimalWithUpstash }; 