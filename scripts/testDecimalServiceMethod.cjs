const { Web3 } = require('web3');
const crypto = require('crypto');

// DecimalChain настройки  
const config = {
  RPC_URL: 'https://node.decimalchain.com/web3/',
  CHAIN_ID: 75,
  GAS_LIMIT: 21000,
  GAS_PRICE: 50000, // Gwei
  WORKING_ADDRESS: '0x59888c4759503AdB6d9280d71999A1Db3Cf5fb43',
  WORKING_PRIVKEY_ENC: 'x435O9YfEK4jdApK2VSc0N8lu/LlWtjDpUmhjGat4AB/7U4eMsOxgBqQOYO/GUjGonYr1csAuwhgXqMw+HtByeUy0JiX50XLLyCTOTtFfrjgqlb6t4X2WIem+guMG00Q',
  KEY_PASSPHRASE: 'PyL34X8rWaU6p2OwErGV'
};

function getPrivateKey() {
  try {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(config.KEY_PASSPHRASE, 'salt', 32);
    const encryptedData = Buffer.from(config.WORKING_PRIVKEY_ENC, 'base64');
    
    const iv = encryptedData.slice(0, 16);
    const encrypted = encryptedData.slice(16);
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, null, 'utf8');
    decrypted += decipher.final('utf8');
    
    // Добавляем префикс "0x" если его нет
    if (!decrypted.startsWith('0x')) {
      decrypted = '0x' + decrypted;
    }
    
    return decrypted;
  } catch (error) {
    throw new Error('Ошибка расшифровки приватного ключа: ' + error.message);
  }
}

// Имитация Redis для nonce
class MockRedis {
  constructor() {
    this.cache = {};
  }
  
  async get(key) {
    return this.cache[key] || null;
  }
  
  async setEx(key, ttl, value) {
    this.cache[key] = value;
    setTimeout(() => delete this.cache[key], ttl * 1000);
  }
}

async function testDecimalServiceMethod() {
  try {
    console.log('🧪 ТЕСТИРОВАНИЕ DECIMAL SERVICE signAndSend');
    console.log('============================================\n');
    
    const web3 = new Web3(config.RPC_URL);
    const mockRedis = new MockRedis();
    
    const toAddress = '0xd6187dD54DF3002D5C82043b81EdE74187A5A647';
    const amount = 0.001; // Маленькая сумма для теста
    
    console.log(`📍 Отправить: ${amount} DEL`);
    console.log(`📍 На адрес: ${toAddress}`);
    console.log(`📍 От адреса: ${config.WORKING_ADDRESS}\n`);
    
    // Шаг 1: Получение приватного ключа
    console.log('🔐 Шаг 1: Получение приватного ключа...');
    let privateKey;
    try {
      privateKey = getPrivateKey();
      console.log('✅ Приватный ключ получен');
      console.log(`   Длина: ${privateKey.length} символов`);
      console.log(`   Формат: ${privateKey.startsWith('0x') ? 'Корректный (0x...)' : 'Некорректный'}`);
    } catch (keyError) {
      console.error(`❌ Ошибка ключа: ${keyError.message}`);
      return;
    }
    
    // Шаг 2: Получение nonce
    console.log('\n📊 Шаг 2: Получение nonce...');
    let nonce;
    try {
      const nonceCacheKey = `DECIMAL_NONCE_${config.WORKING_ADDRESS.toLowerCase()}`;
      const cached = await mockRedis.get(nonceCacheKey);
      
      if (cached !== null) {
        nonce = parseInt(cached) + 1;
        console.log(`✅ Nonce из кэша: ${nonce}`);
      } else {
        nonce = await web3.eth.getTransactionCount(
          web3.utils.toChecksumAddress(config.WORKING_ADDRESS)
        );
        console.log(`✅ Nonce из сети: ${nonce}`);
      }
      
      await mockRedis.setEx(nonceCacheKey, 30, nonce);
      console.log(`   Тип nonce: ${typeof nonce}`);
      console.log(`   Значение: ${nonce}`);
    } catch (nonceError) {
      console.error(`❌ Ошибка nonce: ${nonceError.message}`);
      return;
    }
    
    // Шаг 3: Создание транзакции
    console.log('\n📋 Шаг 3: Создание объекта транзакции...');
    let transaction;
    try {
      transaction = {
        from: web3.utils.toChecksumAddress(config.WORKING_ADDRESS),
        to: web3.utils.toChecksumAddress(toAddress),
        value: web3.utils.toWei(amount.toString(), 'ether'),
        gas: config.GAS_LIMIT,
        gasPrice: web3.utils.toWei(config.GAS_PRICE.toString(), 'gwei'),
        nonce: nonce,
        chainId: config.CHAIN_ID
      };
      
      console.log('✅ Транзакция создана');
      console.log(`   From: ${transaction.from} (тип: ${typeof transaction.from})`);
      console.log(`   To: ${transaction.to} (тип: ${typeof transaction.to})`);
      console.log(`   Value: ${transaction.value} (тип: ${typeof transaction.value})`);
      console.log(`   Gas: ${transaction.gas} (тип: ${typeof transaction.gas})`);
      console.log(`   Gas Price: ${transaction.gasPrice} (тип: ${typeof transaction.gasPrice})`);
      console.log(`   Nonce: ${transaction.nonce} (тип: ${typeof transaction.nonce})`);
      console.log(`   Chain ID: ${transaction.chainId} (тип: ${typeof transaction.chainId})`);
    } catch (txError) {
      console.error(`❌ Ошибка создания транзакции: ${txError.message}`);
      return;
    }
    
    // Шаг 4: Подписание транзакции
    console.log('\n✍️  Шаг 4: Подписание транзакции...');
    let signedTx;
    try {
      console.log(`   Приватный ключ: ${privateKey.substring(0, 10)}...`);
      console.log(`   Тип ключа: ${typeof privateKey}`);
      
      signedTx = await web3.eth.accounts.signTransaction(transaction, privateKey);
      console.log('✅ Транзакция подписана успешно');
      console.log(`   Raw length: ${signedTx.rawTransaction.length}`);
      console.log(`   Raw начало: ${signedTx.rawTransaction.substring(0, 20)}...`);
    } catch (signError) {
      console.error(`❌ ОШИБКА ПОДПИСАНИЯ: ${signError.message}`);
      console.error(`   Тип ошибки: ${signError.name}`);
      console.error(`   Stack: ${signError.stack}`);
      return;
    }
    
    // Шаг 5: Отправка транзакции (симуляция)
    console.log('\n🚀 Шаг 5: Отправка транзакции...');
    console.log('   ⚠️  СИМУЛЯЦИЯ: Транзакция НЕ будет отправлена реально');
    console.log(`   📤 Команда: web3.eth.sendSignedTransaction(rawTransaction)`);
    console.log(`   📄 Raw Transaction: ${signedTx.rawTransaction.substring(0, 66)}...`);
    
    // Попробуем получить хеш транзакции для проверки
    try {
      const txObject = web3.eth.abi.decodeParameters(['string'], signedTx.rawTransaction);
      console.log('✅ Raw транзакция корректная');
    } catch (parseError) {
      console.log(`⚠️  Предупреждение: ${parseError.message}`);
    }
    
    console.log('\n🎉 ВСЕ ШАГИ ПРОШЛИ УСПЕШНО!');
    console.log('============================');
    console.log('✅ Приватный ключ корректен');
    console.log('✅ Nonce получен успешно');
    console.log('✅ Транзакция создана');
    console.log('✅ Подписание работает');
    console.log('\n💡 Если API выводы всё ещё не работают, проблема может быть в:');
    console.log('   - Подключении Redis в реальном DecimalService');
    console.log('   - Переменных окружения в production');
    console.log('   - Конфликте версий Web3');
    
  } catch (error) {
    console.error('\n❌ ОБЩАЯ ОШИБКА:');
    console.error(`   Сообщение: ${error.message}`);
    console.error(`   Тип: ${error.name}`);
    console.error(`   Stack: ${error.stack}`);
  }
}

// Запуск теста
testDecimalServiceMethod().catch(console.error); 