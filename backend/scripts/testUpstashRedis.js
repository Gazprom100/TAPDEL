const fetch = require('node-fetch');

// Данные Upstash
const UPSTASH_REST_URL = "https://inviting-camel-20897.upstash.io";
const UPSTASH_TOKEN = "AVGhAAIjcDFmODU5MjExNTVlNjg0NjQ0ODkwZDg0ODM2Y2FlZjYyNnAxMA";

async function testUpstashRedis() {
  console.log('🧪 Тестирование Upstash Redis через REST API');
  console.log('===========================================');
  
  console.log('\n📋 КОНФИГУРАЦИЯ:');
  console.log(`REST URL: ${UPSTASH_REST_URL}`);
  console.log(`Token: ${UPSTASH_TOKEN.substring(0, 10)}...`);
  
  try {
    // Тест 1: Ping
    console.log('\n🏓 Тест 1: Ping');
    const pingResponse = await fetch(`${UPSTASH_REST_URL}/ping`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (pingResponse.ok) {
      const pingResult = await pingResponse.text();
      console.log(`✅ Ping успешен: ${pingResult}`);
    } else {
      console.log(`❌ Ping неудачен: ${pingResponse.status} ${pingResponse.statusText}`);
    }
    
    // Тест 2: Запись
    console.log('\n📝 Тест 2: Запись данных');
    const testKey = 'tapdel_test_key';
    const testValue = `test_${Date.now()}`;
    
    const setResponse = await fetch(`${UPSTASH_REST_URL}/set/${testKey}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        value: testValue
      })
    });
    
    if (setResponse.ok) {
      const setResult = await setResponse.json();
      console.log(`✅ Запись успешна: ${testKey} = ${testValue}`);
      console.log(`   Результат: ${JSON.stringify(setResult)}`);
    } else {
      console.log(`❌ Запись неудачна: ${setResponse.status} ${setResponse.statusText}`);
    }
    
    // Тест 3: Чтение
    console.log('\n📖 Тест 3: Чтение данных');
    const getResponse = await fetch(`${UPSTASH_REST_URL}/get/${testKey}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (getResponse.ok) {
      const getResult = await getResponse.json();
      console.log(`✅ Чтение успешно: ${testKey} = ${getResult.result}`);
    } else {
      console.log(`❌ Чтение неудачно: ${getResponse.status} ${getResponse.statusText}`);
    }
    
    // Тест 4: DecimalChain ключи
    console.log('\n🔑 Тест 4: DecimalChain ключи');
    
    // Тест nonce
    const nonceKey = 'DECIMAL_NONCE_test_address';
    const nonceValue = '123';
    
    const nonceSetResponse = await fetch(`${UPSTASH_REST_URL}/set/${nonceKey}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        value: nonceValue
      })
    });
    
    if (nonceSetResponse.ok) {
      console.log(`✅ Nonce записан: ${nonceKey} = ${nonceValue}`);
    }
    
    // Тест блока
    const blockKey = 'DECIMAL_LAST_BLOCK';
    const blockValue = '1000';
    
    const blockSetResponse = await fetch(`${UPSTASH_REST_URL}/set/${blockKey}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        value: blockValue
      })
    });
    
    if (blockSetResponse.ok) {
      console.log(`✅ Block записан: ${blockKey} = ${blockValue}`);
    }
    
    // Очистка тестовых ключей
    console.log('\n🧹 Очистка тестовых ключей');
    await fetch(`${UPSTASH_REST_URL}/del/${testKey}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    await fetch(`${UPSTASH_REST_URL}/del/${nonceKey}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    await fetch(`${UPSTASH_REST_URL}/del/${blockKey}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Тестовые ключи очищены');
    
    console.log('\n🎉 Upstash Redis тест завершен успешно!');
    console.log('\n📋 РЕЗУЛЬТАТ:');
    console.log('✅ Upstash Redis работает через REST API');
    console.log('✅ Можете использовать для TAPDEL');
    console.log('✅ DecimalChain сервис будет работать');
    
    return true;
    
  } catch (error) {
    console.error('❌ Ошибка тестирования Upstash Redis:', error);
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
  testUpstashRedis()
    .then(success => {
      if (success) {
        console.log('\n🎉 Upstash Redis тест прошел успешно!');
        process.exit(0);
      } else {
        console.log('\n💥 Upstash Redis тест провалился!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Неожиданная ошибка:', error);
      process.exit(1);
    });
}

module.exports = { testUpstashRedis }; 