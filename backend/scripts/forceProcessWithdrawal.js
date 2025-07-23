const { MongoClient } = require('mongodb');
const { Web3 } = require('web3');
const config = require('../config/decimal');

async function forceProcessWithdrawal() {
  console.log('🔧 ПРИНУДИТЕЛЬНАЯ ОБРАБОТКА ВЫВОДА');
  console.log('=====================================');
  
  const withdrawalId = '6880d1c07f62fb187a3a1636'; // ID вывода 2222 DEL
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tapdel';
  
  try {
    // Подключаемся к MongoDB
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Подключение к MongoDB установлено');
    
    const database = client.db();
    
    // Находим вывод
    console.log('\n1️⃣ Поиск вывода в базе данных');
    const withdrawal = await database.collection('withdrawals').findOne({ _id: withdrawalId });
    
    if (!withdrawal) {
      console.log('❌ Вывод не найден в базе данных');
      return false;
    }
    
    console.log('✅ Вывод найден:', {
      withdrawalId: withdrawal._id,
      status: withdrawal.status,
      amount: withdrawal.amount,
      toAddress: withdrawal.toAddress,
      requestedAt: withdrawal.requestedAt
    });
    
    // Проверяем статус
    if (withdrawal.status === 'sent') {
      console.log('✅ Вывод уже отправлен в блокчейн');
      console.log(`🔗 TX Hash: ${withdrawal.txHash}`);
      return true;
    }
    
    if (withdrawal.status === 'failed') {
      console.log('❌ Вывод помечен как неудачный');
      return false;
    }
    
    // Принудительно обрабатываем вывод
    console.log('\n2️⃣ Принудительная обработка вывода');
    
    // Подключаемся к Web3
    const web3 = new Web3(config.RPC_URL);
    console.log('✅ Подключение к DecimalChain установлено');
    
    // Получаем приватный ключ
    const privateKey = config.getPrivateKey();
    const fromAddress = config.WORKING_ADDRESS;
    
    console.log('📋 Данные для транзакции:');
    console.log(`   От: ${fromAddress}`);
    console.log(`   Кому: ${withdrawal.toAddress}`);
    console.log(`   Сумма: ${withdrawal.amount} DEL`);
    
    // Получаем nonce
    const nonce = await web3.eth.getTransactionCount(fromAddress, 'latest');
    console.log(`📝 Nonce: ${nonce}`);
    
    // Получаем gas price
    const gasPrice = await web3.eth.getGasPrice();
    console.log(`⛽ Gas Price: ${web3.utils.fromWei(gasPrice, 'gwei')} gwei`);
    
    // Создаем транзакцию
    const transaction = {
      from: web3.utils.toChecksumAddress(fromAddress),
      to: web3.utils.toChecksumAddress(withdrawal.toAddress),
      value: web3.utils.toWei(withdrawal.amount.toString(), 'ether'),
      gas: 21000, // Стандартный лимит газа для простых транзакций
      gasPrice: gasPrice,
      nonce: nonce,
      chainId: config.CHAIN_ID
    };
    
    console.log('📋 Транзакция создана:', {
      from: transaction.from,
      to: transaction.to,
      value: withdrawal.amount + ' DEL',
      gas: transaction.gas,
      gasPrice: web3.utils.fromWei(gasPrice, 'gwei') + ' gwei'
    });
    
    // Подписываем транзакцию
    console.log('✍️ Подписываем транзакцию...');
    const signedTx = await web3.eth.accounts.signTransaction(transaction, privateKey);
    
    // Отправляем транзакцию
    console.log('🚀 Отправляем транзакцию в блокчейн...');
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    
    console.log('✅ Транзакция отправлена успешно!');
    console.log(`🔗 TX Hash: ${receipt.transactionHash}`);
    console.log(`📊 Block Number: ${receipt.blockNumber}`);
    console.log(`⛽ Gas Used: ${receipt.gasUsed}`);
    
    // Обновляем статус в базе данных
    console.log('\n3️⃣ Обновление статуса в базе данных');
    await database.collection('withdrawals').updateOne(
      { _id: withdrawalId },
      {
        $set: {
          status: 'sent',
          txHash: receipt.transactionHash,
          processedAt: new Date(),
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed
        }
      }
    );
    
    console.log('✅ Статус вывода обновлен в базе данных');
    
    await client.close();
    console.log('🔌 Подключение к MongoDB закрыто');
    
    console.log('\n🎉 ПРИНУДИТЕЛЬНАЯ ОБРАБОТКА ЗАВЕРШЕНА УСПЕШНО!');
    console.log(`✅ Вывод ${withdrawal.amount} DEL отправлен на адрес ${withdrawal.toAddress}`);
    console.log(`🔗 TX Hash: ${receipt.transactionHash}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Ошибка принудительной обработки:', error);
    return false;
  }
}

// Запускаем обработку если скрипт вызван напрямую
if (require.main === module) {
  forceProcessWithdrawal()
    .then(success => {
      if (success) {
        console.log('\n🎉 ПРИНУДИТЕЛЬНАЯ ОБРАБОТКА ПРОШЛА УСПЕШНО!');
        console.log('✅ 2222 DEL отправлены в блокчейн');
        process.exit(0);
      } else {
        console.log('\n💥 ПРИНУДИТЕЛЬНАЯ ОБРАБОТКА ПРОВАЛИЛАСЬ!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Неожиданная ошибка:', error);
      process.exit(1);
    });
}

module.exports = { forceProcessWithdrawal }; 