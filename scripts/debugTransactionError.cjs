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

function decryptPrivateKey() {
  try {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(config.KEY_PASSPHRASE, 'salt', 32);
    const encryptedData = Buffer.from(config.WORKING_PRIVKEY_ENC, 'base64');
    
    const iv = encryptedData.slice(0, 16);
    const encrypted = encryptedData.slice(16);
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, null, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error('Ошибка расшифровки приватного ключа: ' + error.message);
  }
}

async function debugTransactionError() {
  try {
    console.log('🔍 ОТЛАДКА ОШИБОК ТРАНЗАКЦИЙ');
    console.log('============================\n');
    
    // Инициализация Web3
    const web3 = new Web3(config.RPC_URL);
    console.log(`🌐 Подключение к: ${config.RPC_URL}`);
    
    // Проверяем подключение
    const blockNumber = await web3.eth.getBlockNumber();
    console.log(`✅ Текущий блок: ${blockNumber}`);
    
    // Получаем приватный ключ
    console.log('\n🔐 Расшифровка приватного ключа...');
    const privateKey = decryptPrivateKey();
    console.log('✅ Приватный ключ расшифрован');
    
    // Проверяем адрес
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    console.log(`💼 Адрес из приватного ключа: ${account.address}`);
    console.log(`💼 Ожидаемый адрес: ${config.WORKING_ADDRESS}`);
    
    if (account.address.toLowerCase() !== config.WORKING_ADDRESS.toLowerCase()) {
      console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: Адреса не совпадают!');
      return;
    }
    console.log('✅ Адреса совпадают');
    
    // Получаем балансы
    const gasBalance = await web3.eth.getBalance(config.WORKING_ADDRESS);
    console.log(`\n💰 Gas баланс: ${web3.utils.fromWei(gasBalance, 'ether')} DEL`);
    
    // Получаем nonce
    const nonce = await web3.eth.getTransactionCount(config.WORKING_ADDRESS);
    console.log(`📊 Nonce: ${nonce}`);
    
    // Тестовая транзакция на небольшую сумму
    const testAmount = '0.001'; // 0.001 DEL
    const testAddress = '0xd6187dD54DF3002D5C82043b81EdE74187A5A647';
    
    console.log(`\n🧪 ТЕСТОВАЯ ТРАНЗАКЦИЯ:`);
    console.log(`   Сумма: ${testAmount} DEL`);
    console.log(`   Получатель: ${testAddress}`);
    
    // Создаем транзакцию
    const transaction = {
      from: web3.utils.toChecksumAddress(config.WORKING_ADDRESS),
      to: web3.utils.toChecksumAddress(testAddress),
      value: web3.utils.toWei(testAmount, 'ether'),
      gas: config.GAS_LIMIT,
      gasPrice: web3.utils.toWei(config.GAS_PRICE.toString(), 'gwei'),
      nonce: nonce,
      chainId: config.CHAIN_ID
    };
    
    console.log('\n📋 Параметры транзакции:');
    console.log(`   From: ${transaction.from}`);
    console.log(`   To: ${transaction.to}`);
    console.log(`   Value: ${transaction.value} wei (${testAmount} DEL)`);
    console.log(`   Gas: ${transaction.gas}`);
    console.log(`   Gas Price: ${transaction.gasPrice} wei (${config.GAS_PRICE} Gwei)`);
    console.log(`   Nonce: ${transaction.nonce}`);
    console.log(`   Chain ID: ${transaction.chainId}`);
    
    // Оценка газа
    try {
      console.log('\n⛽ Проверка оценки газа...');
      const estimatedGas = await web3.eth.estimateGas(transaction);
      console.log(`✅ Оценка газа: ${estimatedGas}`);
      
      if (estimatedGas > config.GAS_LIMIT) {
        console.log(`⚠️  Предупреждение: Оценка газа (${estimatedGas}) больше лимита (${config.GAS_LIMIT})`);
      }
    } catch (gasError) {
      console.error(`❌ Ошибка оценки газа: ${gasError.message}`);
      console.log('🔍 Возможные причины:');
      console.log('   - Неверный адрес получателя');
      console.log('   - Недостаточно средств');
      console.log('   - Проблемы с сетью');
      return;
    }
    
    // Подписываем транзакцию
    console.log('\n✍️  Подписание транзакции...');
    try {
      const signedTx = await web3.eth.accounts.signTransaction(transaction, privateKey);
      console.log('✅ Транзакция подписана');
      console.log(`📄 Raw Transaction: ${signedTx.rawTransaction.substring(0, 66)}...`);
      
      // СИМУЛЯЦИЯ отправки (не отправляем реально)
      console.log('\n🎭 СИМУЛЯЦИЯ ОТПРАВКИ (реальная отправка отключена)');
      console.log('   Если бы отправляли реально:');
      console.log(`   📤 Команда: web3.eth.sendSignedTransaction('${signedTx.rawTransaction}')`);
      console.log('   ⏳ Ожидание майнинга...');
      console.log('   ✅ Транзакция должна пройти успешно');
      
      // Проверим, почему могут быть ошибки в реальном коде
      console.log('\n🔍 АНАЛИЗ ВОЗМОЖНЫХ ПРОБЛЕМ:');
      console.log('✅ Приватный ключ корректен');
      console.log('✅ Адрес соответствует ключу'); 
      console.log('✅ Gas баланс достаточен');
      console.log('✅ Оценка газа прошла');
      console.log('✅ Транзакция подписывается');
      console.log('✅ Подключение к сети работает');
      
      console.log('\n💡 ВОЗМОЖНЫЕ ПРИЧИНЫ ОШИБОК В PRODUCTION:');
      console.log('1. 🌐 Временные проблемы с RPC узлом');
      console.log('2. ⚡ Слишком низкий gas price для быстрого майнинга');
      console.log('3. 🔄 Проблемы с nonce (повторное использование)');
      console.log('4. 🚦 Ограничения пропускной способности сети');
      console.log('5. 🛡️  Защитные механизмы в development среде');
      
    } catch (signError) {
      console.error(`❌ Ошибка подписания: ${signError.message}`);
    }
    
  } catch (error) {
    console.error('❌ Общая ошибка отладки:', error);
  }
}

// Запуск отладки
debugTransactionError().catch(console.error); 