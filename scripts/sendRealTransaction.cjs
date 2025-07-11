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
    
    // Добавляем префикс "0x" если его нет
    if (!decrypted.startsWith('0x')) {
      decrypted = '0x' + decrypted;
    }
    
    return decrypted;
  } catch (error) {
    throw new Error('Ошибка расшифровки приватного ключа: ' + error.message);
  }
}

async function sendRealTransaction() {
  try {
    console.log('🚀 ОТПРАВКА РЕАЛЬНОЙ ТРАНЗАКЦИИ DEL');
    console.log('==================================\n');
    
    const amount = '5555'; // 5555 DEL
    const toAddress = '0xd6187dD54DF3002D5C82043b81EdE74187A5A647';
    
    console.log(`💰 Сумма: ${amount} DEL`);
    console.log(`📍 Получатель: ${toAddress}`);
    console.log(`📍 Отправитель: ${config.WORKING_ADDRESS}\n`);
    
    // Инициализация Web3
    const web3 = new Web3(config.RPC_URL);
    console.log(`🌐 RPC: ${config.RPC_URL}`);
    
    // Проверяем подключение
    const blockNumber = await web3.eth.getBlockNumber();
    console.log(`✅ Текущий блок: ${blockNumber}`);
    
    // Получаем приватный ключ
    console.log('\n🔐 Расшифровка приватного ключа...');
    const privateKey = decryptPrivateKey();
    console.log('✅ Приватный ключ расшифрован');
    
    // Проверяем адрес
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    console.log(`💼 Адрес из ключа: ${account.address}`);
    
    if (account.address.toLowerCase() !== config.WORKING_ADDRESS.toLowerCase()) {
      throw new Error('Адреса не совпадают!');
    }
    
    // Проверяем балансы
    const senderBalance = await web3.eth.getBalance(config.WORKING_ADDRESS);
    const senderBalanceDEL = web3.utils.fromWei(senderBalance, 'ether');
    console.log(`💰 Баланс отправителя: ${senderBalanceDEL} DEL`);
    
    const receiverBalance = await web3.eth.getBalance(toAddress);
    const receiverBalanceDEL = web3.utils.fromWei(receiverBalance, 'ether');
    console.log(`💰 Баланс получателя (до): ${receiverBalanceDEL} DEL`);
    
    // Проверяем достаточность средств
    const amountWei = web3.utils.toWei(amount, 'ether');
    const gasPrice = web3.utils.toWei(config.GAS_PRICE.toString(), 'gwei');
    const gasWei = BigInt(config.GAS_LIMIT) * BigInt(gasPrice);
    const totalWei = BigInt(amountWei) + gasWei;
    
    console.log(`\n⛽ Расчёт стоимости:`);
    console.log(`   Сумма перевода: ${amount} DEL`);
    console.log(`   Gas стоимость: ${web3.utils.fromWei(gasWei.toString(), 'ether')} DEL`);
    console.log(`   Общая стоимость: ${web3.utils.fromWei(totalWei.toString(), 'ether')} DEL`);
    
    if (BigInt(senderBalance) < totalWei) {
      throw new Error(`Недостаточно средств! Нужно: ${web3.utils.fromWei(totalWei.toString(), 'ether')} DEL`);
    }
    console.log('✅ Средств достаточно');
    
    // Получаем nonce
    const nonce = await web3.eth.getTransactionCount(config.WORKING_ADDRESS);
    console.log(`📊 Nonce: ${nonce}`);
    
    // Создаем транзакцию
    const transaction = {
      from: web3.utils.toChecksumAddress(config.WORKING_ADDRESS),
      to: web3.utils.toChecksumAddress(toAddress),
      value: amountWei,
      gas: config.GAS_LIMIT,
      gasPrice: gasPrice,
      nonce: nonce,
      chainId: config.CHAIN_ID
    };
    
    console.log('\n📋 Параметры транзакции:');
    console.log(`   From: ${transaction.from}`);
    console.log(`   To: ${transaction.to}`);
    console.log(`   Value: ${amount} DEL`);
    console.log(`   Gas: ${transaction.gas}`);
    console.log(`   Gas Price: ${config.GAS_PRICE} Gwei`);
    console.log(`   Nonce: ${transaction.nonce}`);
    console.log(`   Chain ID: ${transaction.chainId}`);
    
    // Оценка газа
    console.log('\n⛽ Проверка оценки газа...');
    const estimatedGas = await web3.eth.estimateGas(transaction);
    console.log(`✅ Оценка газа: ${estimatedGas}`);
    
    if (estimatedGas > config.GAS_LIMIT) {
      console.log(`⚠️  Увеличиваем gas limit с ${config.GAS_LIMIT} до ${estimatedGas}`);
      transaction.gas = estimatedGas;
    }
    
    // Подписываем транзакцию
    console.log('\n✍️  Подписание транзакции...');
    const signedTx = await web3.eth.accounts.signTransaction(transaction, privateKey);
    console.log('✅ Транзакция подписана');
    
    // РЕАЛЬНАЯ ОТПРАВКА
    console.log('\n🚀 ОТПРАВКА ТРАНЗАКЦИИ В СЕТЬ...');
    console.log('⚠️  ВНИМАНИЕ: Это реальная транзакция с реальными DEL!');
    
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    
    console.log('\n🎉 ТРАНЗАКЦИЯ ОТПРАВЛЕНА УСПЕШНО!');
    console.log('================================');
    console.log(`📄 Transaction Hash: ${receipt.transactionHash}`);
    console.log(`🧱 Block Number: ${receipt.blockNumber}`);
    console.log(`⛽ Gas Used: ${receipt.gasUsed}`);
    console.log(`📍 Status: ${receipt.status ? 'SUCCESS' : 'FAILED'}`);
    
    // Проверяем новые балансы
    console.log('\n💰 БАЛАНСЫ ПОСЛЕ ТРАНЗАКЦИИ:');
    
    const newSenderBalance = await web3.eth.getBalance(config.WORKING_ADDRESS);
    const newSenderBalanceDEL = web3.utils.fromWei(newSenderBalance, 'ether');
    console.log(`   Отправитель: ${newSenderBalanceDEL} DEL (было: ${senderBalanceDEL} DEL)`);
    
    const newReceiverBalance = await web3.eth.getBalance(toAddress);
    const newReceiverBalanceDEL = web3.utils.fromWei(newReceiverBalance, 'ether');
    console.log(`   Получатель: ${newReceiverBalanceDEL} DEL (было: ${receiverBalanceDEL} DEL)`);
    
    const sent = parseFloat(senderBalanceDEL) - parseFloat(newSenderBalanceDEL);
    const received = parseFloat(newReceiverBalanceDEL) - parseFloat(receiverBalanceDEL);
    
    console.log(`\n📊 ИЗМЕНЕНИЯ:`);
    console.log(`   Отправлено (включая gas): ${sent.toFixed(6)} DEL`);
    console.log(`   Получено: ${received.toFixed(6)} DEL`);
    
    if (Math.abs(received - parseFloat(amount)) < 0.000001) {
      console.log(`   ✅ Получена правильная сумма: ${amount} DEL`);
    } else {
      console.log(`   ❌ Ошибка: ожидалось ${amount} DEL, получено ${received} DEL`);
    }
    
    console.log(`\n🔗 Проверить в блокчейне:`);
    console.log(`   https://explorer.decimalchain.com/tx/${receipt.transactionHash}`);
    
  } catch (error) {
    console.error('\n❌ ОШИБКА ОТПРАВКИ ТРАНЗАКЦИИ:');
    console.error(error.message);
    
    if (error.message.includes('insufficient funds')) {
      console.error('\n💡 Проблема: Недостаточно средств');
      console.error('   - Проверьте баланс DEL на рабочем кошельке');
      console.error('   - Убедитесь что хватает на gas');
    } else if (error.message.includes('nonce')) {
      console.error('\n💡 Проблема: Конфликт nonce');
      console.error('   - Попробуйте через несколько секунд');
      console.error('   - Возможно есть pending транзакции');
    } else if (error.message.includes('gas')) {
      console.error('\n💡 Проблема: Gas');
      console.error('   - Возможно gas price слишком низкий');
      console.error('   - Или gas limit недостаточен');
    } else {
      console.error('\n💡 Общие рекомендации:');
      console.error('   - Проверьте подключение к сети');
      console.error('   - Убедитесь что RPC узел доступен');
      console.error('   - Проверьте правильность адреса получателя');
    }
  }
}

// Запуск отправки
sendRealTransaction().catch(console.error); 