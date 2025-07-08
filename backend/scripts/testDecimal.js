const { Web3 } = require('web3');
const redis = require('redis');
require('dotenv').config();

const config = require('../config/decimal');

async function testDecimalConnection() {
  console.log('🧪 Тестирование DecimalChain интеграции...\n');
  
  const tests = [];
  
  // Тест 1: Проверка конфигурации
  console.log('1️⃣ Проверка конфигурации...');
  try {
    console.log(`   RPC URL: ${config.RPC_URL}`);
    console.log(`   Chain ID: ${config.CHAIN_ID}`);
    console.log(`   Working Address: ${config.WORKING_ADDRESS}`);
    console.log(`   Gas Price: ${config.GAS_PRICE} Gwei`);
    console.log(`   Confirmations: ${config.CONFIRMATIONS}`);
    console.log(`   Redis URL: ${config.REDIS_URL}`);
    
    if (!config.WORKING_ADDRESS) {
      throw new Error('DECIMAL_WORKING_ADDRESS не установлен');
    }
    
    tests.push({ name: 'Конфигурация', status: '✅ Пройден' });
  } catch (error) {
    tests.push({ name: 'Конфигурация', status: '❌ Ошибка: ' + error.message });
  }
  
  // Тест 2: Подключение к DecimalChain
  console.log('\n2️⃣ Подключение к DecimalChain...');
  try {
    const web3 = new Web3(config.RPC_URL);
    const blockNumber = await web3.eth.getBlockNumber();
    console.log(`   Текущий блок: ${blockNumber}`);
    
    const balance = await web3.eth.getBalance(config.WORKING_ADDRESS);
    const balanceEth = web3.utils.fromWei(balance, 'ether');
    console.log(`   Баланс рабочего кошелька: ${balanceEth} DEL`);
    
    tests.push({ name: 'DecimalChain RPC', status: '✅ Подключен' });
  } catch (error) {
    tests.push({ name: 'DecimalChain RPC', status: '❌ Ошибка: ' + error.message });
  }
  
  // Тест 3: Расшифровка приватного ключа
  console.log('\n3️⃣ Проверка приватного ключа...');
  try {
    const privateKey = config.getPrivateKey();
    console.log(`   Приватный ключ: ${privateKey.substring(0, 8)}...${privateKey.substring(privateKey.length - 8)}`);
    
    // Очищаем из памяти
    privateKey.split('').forEach((char, index) => {
      privateKey[index] = '0';
    });
    
    tests.push({ name: 'Приватный ключ', status: '✅ Расшифрован' });
  } catch (error) {
    tests.push({ name: 'Приватный ключ', status: '❌ Ошибка: ' + error.message });
  }
  
  // Тест 4: Подключение к Redis
  console.log('\n4️⃣ Подключение к Redis...');
  let redisClient = null;
  try {
    redisClient = redis.createClient({ url: config.REDIS_URL });
    await redisClient.connect();
    
    // Тестовая операция
    await redisClient.set('test_key', 'test_value');
    const value = await redisClient.get('test_key');
    await redisClient.del('test_key');
    
    if (value === 'test_value') {
      console.log('   Redis работает корректно');
      tests.push({ name: 'Redis', status: '✅ Подключен' });
    } else {
      throw new Error('Ошибка записи/чтения');
    }
  } catch (error) {
    tests.push({ name: 'Redis', status: '❌ Ошибка: ' + error.message });
  } finally {
    if (redisClient) {
      await redisClient.disconnect();
    }
  }
  
  // Тест 5: Генерация уникальных сумм
  console.log('\n5️⃣ Генерация уникальных сумм...');
  try {
    const testUserId = 'test-user-123';
    const baseAmount = 1.0;
    
    const uniqueAmount1 = config.generateUniqueAmount(baseAmount, testUserId);
    const uniqueAmount2 = config.generateUniqueAmount(baseAmount, testUserId + '456');
    
    console.log(`   Пользователь 1: ${baseAmount} → ${uniqueAmount1} DEL`);
    console.log(`   Пользователь 2: ${baseAmount} → ${uniqueAmount2} DEL`);
    
    if (uniqueAmount1 !== uniqueAmount2) {
      tests.push({ name: 'Уникальные суммы', status: '✅ Генерируются' });
    } else {
      throw new Error('Суммы не уникальны');
    }
  } catch (error) {
    tests.push({ name: 'Уникальные суммы', status: '❌ Ошибка: ' + error.message });
  }
  
  // Вывод результатов
  console.log('\n📊 Результаты тестирования:');
  console.log('═══════════════════════════════════════');
  
  let passed = 0;
  tests.forEach(test => {
    console.log(`${test.status.includes('✅') ? '✅' : '❌'} ${test.name}: ${test.status}`);
    if (test.status.includes('✅')) passed++;
  });
  
  console.log('═══════════════════════════════════════');
  console.log(`Пройдено: ${passed}/${tests.length} тестов`);
  
  if (passed === tests.length) {
    console.log('\n🎉 Все тесты пройдены! DecimalChain готов к использованию.');
  } else {
    console.log('\n⚠️ Некоторые тесты не пройдены. Проверьте конфигурацию.');
  }
  
  process.exit(passed === tests.length ? 0 : 1);
}

testDecimalConnection().catch(error => {
  console.error('💥 Критическая ошибка тестирования:', error);
  process.exit(1);
}); 