const { Web3 } = require('web3');
const crypto = require('crypto');

// Конфигурация DecimalChain
const RPC_URL = 'https://node.decimalchain.com/web3/';
const CHAIN_ID = 75;
const GAS_LIMIT = 21000;
const GAS_PRICE = 50000;

// Рабочий кошелек
const WORKING_ADDRESS = '0x59888c4759503AdB6d9280d71999A1Db3Cf5fb43';
const WORKING_PRIVKEY_ENC = 'x435O9YfEK4jdApK2VSc0N8lu/LlWtjDpUmhjGat4AB/7U4eMsOxgBqQOYO/GUjGonYr1csAuwhgXqMw+HtByeUy0JiX50XLLyCTOTtFfrjgqlb6t4X2WIem+guMG00Q';
const KEY_PASSPHRASE = 'PyL34X8rWaU6p2OwErGV';

// Расшифровка приватного ключа
function getPrivateKey() {
  try {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(KEY_PASSPHRASE, 'salt', 32);
    const encryptedData = Buffer.from(WORKING_PRIVKEY_ENC, 'base64');
    
    const iv = encryptedData.slice(0, 16);
    const encrypted = encryptedData.slice(16);
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, null, 'utf8');
    decrypted += decipher.final('utf8');
    
    if (!decrypted.startsWith('0x')) {
      decrypted = '0x' + decrypted;
    }
    
    return decrypted;
  } catch (error) {
    throw new Error('Ошибка расшифровки приватного ключа: ' + error.message);
  }
}

async function testTransaction() {
  try {
    console.log('🔍 Тестирование отправки транзакции...');
    
    const web3 = new Web3(RPC_URL);
    
    // Проверяем подключение
    const blockNumber = await web3.eth.getBlockNumber();
    console.log('✅ Подключен к DecimalChain, блок:', blockNumber);
    
    // Проверяем баланс
    const balance = await web3.eth.getBalance(WORKING_ADDRESS);
    const balanceInDel = parseFloat(web3.utils.fromWei(balance, 'ether'));
    console.log('💰 Баланс рабочего кошелька:', balanceInDel, 'DEL');
    
    // Получаем приватный ключ
    const privateKey = getPrivateKey();
    console.log('🔑 Приватный ключ получен');
    
    // Получаем nonce
    const nonce = await web3.eth.getTransactionCount(WORKING_ADDRESS);
    console.log('📝 Nonce:', nonce);
    
    // Создаем тестовую транзакцию (0.001 DEL)
    const testAmount = '0.001';
    const testToAddress = '0xd6187dD54DF3002D5C82043b81EdE74187A5A647';
    
    const transaction = {
      from: web3.utils.toChecksumAddress(WORKING_ADDRESS),
      to: web3.utils.toChecksumAddress(testToAddress),
      value: web3.utils.toWei(testAmount, 'ether'),
      gas: GAS_LIMIT,
      gasPrice: web3.utils.toWei(GAS_PRICE.toString(), 'gwei'),
      nonce: nonce,
      chainId: CHAIN_ID
    };
    
    console.log('📋 Транзакция создана:', {
      from: transaction.from,
      to: transaction.to,
      value: testAmount + ' DEL',
      gas: transaction.gas,
      gasPrice: GAS_PRICE + ' gwei'
    });
    
    // Подписываем транзакцию
    const signedTx = await web3.eth.accounts.signTransaction(transaction, privateKey);
    console.log('✍️ Транзакция подписана');
    
    // Отправляем транзакцию
    console.log('🚀 Отправляем транзакцию...');
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    
    console.log('✅ Транзакция отправлена успешно!');
    console.log('📄 Hash:', receipt.transactionHash);
    console.log('📦 Block:', receipt.blockNumber);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error('📋 Детали:', error);
  }
}

testTransaction(); 