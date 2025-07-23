require('dotenv').config({ path: './.env' });
const fetch = require('node-fetch');
const config = require('../config/decimal');

class DecimalApiTester {
  constructor() {
    this.apiBaseUrl = config.API_BASE_URL;
  }

  async testApiEndpoints() {
    console.log('🧪 Тестирование DecimalChain API...\n');

    // Тест 1: Проверка доступности API
    console.log('1️⃣ Проверка доступности API...');
    try {
      const response = await fetch(`${this.apiBaseUrl}/addresses/`);
      console.log(`   Статус: ${response.status}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ API доступен, получено ${data.result?.adresses?.length || 0} адресов`);
      } else {
        console.log(`   ❌ API недоступен: ${response.statusText}`);
      }
    } catch (error) {
      console.log(`   ❌ Ошибка подключения к API: ${error.message}`);
    }

    // Тест 2: Проверка баланса рабочего адреса
    console.log('\n2️⃣ Проверка баланса рабочего адреса...');
    if (config.WORKING_ADDRESS) {
      try {
        const balanceData = await config.getAddressBalance(config.WORKING_ADDRESS);
        console.log(`   Адрес: ${config.WORKING_ADDRESS}`);
        console.log(`   Ответ API:`, JSON.stringify(balanceData, null, 2));
      } catch (error) {
        console.log(`   ❌ Ошибка получения баланса: ${error.message}`);
      }
    } else {
      console.log('   ⚠️ WORKING_ADDRESS не настроен');
    }

    // Тест 3: Проверка транзакций
    console.log('\n3️⃣ Проверка транзакций...');
    if (config.WORKING_ADDRESS) {
      try {
        const txData = await config.getAddressTransactions(config.WORKING_ADDRESS, 5);
        console.log(`   Адрес: ${config.WORKING_ADDRESS}`);
        console.log(`   Ответ API:`, JSON.stringify(txData, null, 2));
      } catch (error) {
        console.log(`   ❌ Ошибка получения транзакций: ${error.message}`);
      }
    }

    // Тест 4: Проверка RPC
    console.log('\n4️⃣ Проверка RPC подключения...');
    try {
      const { Web3 } = require('web3');
      const web3 = new Web3(config.RPC_URL);
      
      const blockNumber = await web3.eth.getBlockNumber();
      console.log(`   ✅ RPC подключен, блок: ${blockNumber}`);
      
      const gasPrice = await web3.eth.getGasPrice();
      const gasPriceGwei = Number(gasPrice) / 1000000000;
      console.log(`   Газ прайс: ${gasPriceGwei} gwei`);
      
      if (config.WORKING_ADDRESS) {
        const balance = await web3.eth.getBalance(config.WORKING_ADDRESS);
        const balanceDel = Number(balance) / 1000000000000000000;
        console.log(`   Баланс RPC: ${balanceDel} DEL`);
      }
    } catch (error) {
      console.log(`   ❌ Ошибка RPC: ${error.message}`);
    }

    // Тест 5: Проверка конфигурации
    console.log('\n5️⃣ Проверка конфигурации...');
    console.log(`   API Base URL: ${config.API_BASE_URL}`);
    console.log(`   RPC URL: ${config.RPC_URL}`);
    console.log(`   Chain ID: ${config.CHAIN_ID}`);
    console.log(`   Gas Price: ${config.GAS_PRICE} gwei`);
    console.log(`   Working Address: ${config.WORKING_ADDRESS ? 'Настроен' : 'Не настроен'}`);
    console.log(`   Private Key: ${config.WORKING_PRIVKEY_ENC ? 'Настроен' : 'Не настроен'}`);
    console.log(`   Key Passphrase: ${config.KEY_PASSPHRASE ? 'Настроен' : 'Не настроен'}`);

    console.log('\n✅ Тестирование завершено');
  }

  async testTransactionSending() {
    console.log('\n🧪 Тестирование отправки транзакции...');
    
    if (!config.isConfigured()) {
      console.log('❌ Конфигурация неполная, пропускаем тест транзакции');
      return;
    }

    try {
      const { Web3 } = require('web3');
      const web3 = new Web3(config.RPC_URL);
      
      // Создаем тестовую транзакцию (не отправляем)
      const privateKey = config.getPrivateKey();
      const fromAddress = config.WORKING_ADDRESS;
      const toAddress = '0x1234567890123456789012345678901234567890'; // Тестовый адрес
      
      const nonce = await web3.eth.getTransactionCount(fromAddress);
      const gasPrice = await config.getCurrentGasPrice();
      
      const transaction = {
        from: web3.utils.toChecksumAddress(fromAddress),
        to: web3.utils.toChecksumAddress(toAddress),
        value: web3.utils.toWei('0.001', 'ether'),
        gas: config.GAS_LIMIT,
        gasPrice: web3.utils.toWei(gasPrice.toString(), 'gwei'),
        nonce: nonce,
        chainId: config.CHAIN_ID
      };

      console.log('   📋 Тестовая транзакция создана:');
      console.log(`      From: ${transaction.from}`);
      console.log(`      To: ${transaction.to}`);
      console.log(`      Value: 0.001 DEL`);
      console.log(`      Gas: ${transaction.gas}`);
      console.log(`      Gas Price: ${gasPrice} gwei`);
      console.log(`      Nonce: ${nonce}`);
      
      // Подписываем транзакцию (но не отправляем)
      const signedTx = await web3.eth.accounts.signTransaction(transaction, privateKey);
      console.log('   ✅ Транзакция подписана успешно');
      console.log(`   📝 Raw Transaction: ${signedTx.rawTransaction.substring(0, 66)}...`);
      
    } catch (error) {
      console.log(`   ❌ Ошибка создания транзакции: ${error.message}`);
    }
  }
}

// Запуск тестов
async function runTests() {
  const tester = new DecimalApiTester();
  
  try {
    await tester.testApiEndpoints();
    await tester.testTransactionSending();
  } catch (error) {
    console.error('❌ Ошибка выполнения тестов:', error);
  }
}

// Запускаем если скрипт вызван напрямую
if (require.main === module) {
  runTests();
}

module.exports = DecimalApiTester; 