const { MongoClient } = require('mongodb');
const { Web3 } = require('web3');
require('dotenv').config({ path: './.env' });

const config = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://TAPDEL:fpz%25sE62KPzmHfM@cluster0.ejo8obw.mongodb.net/tapdel?retryWrites=true&w=majority&appName=Cluster0',
  DECIMAL_RPC_URL: process.env.DECIMAL_RPC_URL || 'https://node.decimalchain.com/web3/',
  WORKING_ADDRESS: process.env.DECIMAL_WORKING_ADDRESS,
  PRIVATE_KEY: process.env.DECIMAL_WORKING_PRIVKEY_ENC,
  KEY_PASSPHRASE: process.env.DECIMAL_KEY_PASSPHRASE,
  GAS_LIMIT: 21000,
  GAS_PRICE: 5,
  CHAIN_ID: 75
};

// Функция расшифровки приватного ключа (копия из config/decimal.js)
function getPrivateKey() {
  const crypto = require('crypto');
  
  if (!config.PRIVATE_KEY || !config.KEY_PASSPHRASE) {
    throw new Error('DECIMAL_WORKING_PRIVKEY_ENC и DECIMAL_KEY_PASSPHRASE должны быть установлены');
  }
  
  try {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(config.KEY_PASSPHRASE, 'salt', 32);
    const encryptedData = Buffer.from(config.PRIVATE_KEY, 'base64');
    
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

async function forceProcessWithdrawal(withdrawalId) {
  console.log(`🚀 Принудительная обработка вывода: ${withdrawalId}`);
  
  try {
    // Подключение к MongoDB
    const client = new MongoClient(config.MONGODB_URI);
    await client.connect();
    const db = client.db('tapdel');
    console.log('✅ MongoDB подключен');
    
    // Подключение к DecimalChain
    const web3 = new Web3(config.DECIMAL_RPC_URL);
    const blockNumber = await web3.eth.getBlockNumber();
    console.log(`✅ DecimalChain подключен, блок: ${blockNumber}`);
    
    // Получаем вывод
    const withdrawal = await db.collection('withdrawals').findOne({
      _id: new (require('mongodb').ObjectId)(withdrawalId)
    });
    
    if (!withdrawal) {
      console.log(`❌ Вывод ${withdrawalId} не найден`);
      return;
    }
    
    console.log(`📋 Детали вывода:`);
    console.log(`   Сумма: ${withdrawal.amount} DEL`);
    console.log(`   Адрес: ${withdrawal.toAddress}`);
    console.log(`   Статус: ${withdrawal.status}`);
    
    if (withdrawal.status === 'sent') {
      console.log(`✅ Вывод уже обработан, TX: ${withdrawal.txHash}`);
      return;
    }
    
    if (withdrawal.status === 'failed') {
      console.log(`❌ Вывод уже помечен как failed: ${withdrawal.error}`);
      return;
    }
    
    // Проверяем баланс пользователя
    const user = await db.collection('users').findOne({ userId: withdrawal.userId });
    if (!user) {
      console.log(`❌ Пользователь ${withdrawal.userId} не найден`);
      return;
    }
    
    const userBalance = user.gameState?.tokens || 0;
    console.log(`💰 Баланс пользователя: ${userBalance} DEL`);
    
    if (userBalance < withdrawal.amount) {
      console.log(`❌ Недостаточно средств: ${userBalance} < ${withdrawal.amount}`);
      return;
    }
    
    // Проверяем баланс рабочего кошелька
    const workingBalance = await web3.eth.getBalance(config.WORKING_ADDRESS);
    const workingBalanceEth = parseFloat(web3.utils.fromWei(workingBalance, 'ether'));
    console.log(`💰 Баланс рабочего кошелька: ${workingBalanceEth} DEL`);
    
    // Получаем приватный ключ
    console.log(`🔑 Расшифровываем приватный ключ...`);
    const privateKey = getPrivateKey();
    console.log(`✅ Приватный ключ получен: ${privateKey.substring(0, 10)}...`);
    
    // Получаем nonce
    const nonce = await web3.eth.getTransactionCount(config.WORKING_ADDRESS);
    console.log(`📝 Nonce: ${nonce}`);
    
    // Создаем транзакцию
    const amountNum = parseFloat(withdrawal.amount);
    const transaction = {
      from: web3.utils.toChecksumAddress(config.WORKING_ADDRESS),
      to: web3.utils.toChecksumAddress(withdrawal.toAddress),
      value: web3.utils.toWei(amountNum.toString(), 'ether'),
      gas: config.GAS_LIMIT,
      gasPrice: web3.utils.toWei(config.GAS_PRICE.toString(), 'gwei'),
      nonce: nonce,
      chainId: config.CHAIN_ID
    };
    
    console.log(`📋 Транзакция создана:`);
    console.log(`   From: ${transaction.from}`);
    console.log(`   To: ${transaction.to}`);
    console.log(`   Value: ${amountNum} DEL (${transaction.value} wei)`);
    console.log(`   Gas: ${transaction.gas}`);
    console.log(`   Gas Price: ${config.GAS_PRICE} gwei`);
    console.log(`   Nonce: ${transaction.nonce}`);
    console.log(`   Chain ID: ${transaction.chainId}`);
    
    // Подписываем транзакцию
    console.log(`✍️ Подписываем транзакцию...`);
    const signedTx = await web3.eth.accounts.signTransaction(transaction, privateKey);
    console.log(`✅ Транзакция подписана`);
    
    // Отправляем транзакцию
    console.log(`📡 Отправляем транзакцию...`);
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    
    console.log(`✅ Транзакция отправлена!`);
    console.log(`📄 TX Hash: ${receipt.transactionHash}`);
    console.log(`📊 Block: ${receipt.blockNumber}`);
    console.log(`⛽ Gas Used: ${receipt.gasUsed}`);
    
    // Обновляем вывод в базе данных
    await db.collection('withdrawals').updateOne(
      { _id: withdrawal._id },
      {
        $set: {
          txHash: receipt.transactionHash,
          status: 'sent',
          processedAt: new Date()
        },
        $unset: { processingStartedAt: 1 }
      }
    );
    
    console.log(`✅ Вывод обновлен в базе данных`);
    
    await client.close();
    
  } catch (error) {
    console.error('❌ Ошибка обработки вывода:', error);
    console.error('📋 Детали ошибки:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
  }
}

// Получаем ID вывода из аргументов
const withdrawalId = process.argv[2];

if (!withdrawalId) {
  console.error('❌ Укажите ID вывода: node scripts/forceProcessWithdrawal.js <withdrawalId>');
  process.exit(1);
}

forceProcessWithdrawal(withdrawalId); 