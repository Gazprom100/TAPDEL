const decimalService = require('../services/decimalService');
const databaseConfig = require('../config/database');
const config = require('../config/decimal');

async function checkSpecificTransaction() {
  try {
    console.log('🔍 ПРОВЕРКА КОНКРЕТНОЙ ТРАНЗАКЦИИ');
    console.log('=====================================');
    
    const txHash = '0xC3AB0FB9CEB1BCFB597B143C8DC34BE3032263A6922258F1EC73C2EC7EA88BEC';
    
    // Инициализируем DecimalService
    if (!decimalService.web3) {
      await decimalService.initialize();
    }
    console.log('✅ DecimalService инициализирован');
    
    // Получаем информацию о транзакции
    console.log(`\n📋 Получение информации о транзакции: ${txHash}`);
    const tx = await decimalService.web3.eth.getTransaction(txHash);
    
    if (!tx) {
      console.log('❌ Транзакция не найдена');
      return;
    }
    
    console.log('✅ Транзакция найдена:');
    console.log(`   From: ${tx.from}`);
    console.log(`   To: ${tx.to}`);
    console.log(`   Value: ${decimalService.web3.utils.fromWei(tx.value, 'ether')} DEL`);
    console.log(`   Block Number: ${tx.blockNumber}`);
    console.log(`   Gas Used: ${tx.gas}`);
    console.log(`   Gas Price: ${decimalService.web3.utils.fromWei(tx.gasPrice, 'gwei')} gwei`);
    
    // Получаем receipt
    const receipt = await decimalService.web3.eth.getTransactionReceipt(txHash);
    if (receipt) {
      console.log(`   Status: ${receipt.status ? 'Success' : 'Failed'}`);
      console.log(`   Gas Used: ${receipt.gasUsed}`);
    }
    
    // Проверяем, направлена ли транзакция на рабочий адрес
    const isToWorkingAddress = tx.to && tx.to.toLowerCase() === config.WORKING_ADDRESS.toLowerCase();
    console.log(`\n🎯 Проверка адреса назначения:`);
    console.log(`   Рабочий адрес: ${config.WORKING_ADDRESS}`);
    console.log(`   Адрес назначения: ${tx.to}`);
    console.log(`   Направлена на рабочий адрес: ${isToWorkingAddress ? '✅ ДА' : '❌ НЕТ'}`);
    
    if (isToWorkingAddress) {
      const value = parseFloat(decimalService.web3.utils.fromWei(tx.value, 'ether'));
      console.log(`\n💰 Сумма транзакции: ${value} DEL`);
      
      // Подключаемся к базе данных
      const database = await databaseConfig.connect();
      console.log('✅ База данных подключена');
      
      // Ищем депозит с такой суммой
      const deposits = await database.collection('deposits').find({
        matched: false,
        expiresAt: { $gt: new Date() }
      }).toArray();
      
      console.log(`\n🔍 Поиск подходящего депозита:`);
      console.log(`   Активных депозитов: ${deposits.length}`);
      
      for (const deposit of deposits) {
        const roundedValue = Math.round(value * 10000) / 10000;
        const depositRounded = Math.round(deposit.uniqueAmount * 10000) / 10000;
        const EPSILON = 0.00005;
        
        console.log(`\n   Депозит ${deposit.uniqueAmount} DEL:`);
        console.log(`     Округленная сумма TX: ${roundedValue}`);
        console.log(`     Округленная сумма депозита: ${depositRounded}`);
        console.log(`     Разница: ${Math.abs(roundedValue - depositRounded)}`);
        console.log(`     Подходит: ${Math.abs(roundedValue - depositRounded) <= EPSILON ? '✅ ДА' : '❌ НЕТ'}`);
        
        if (Math.abs(roundedValue - depositRounded) <= EPSILON) {
          console.log(`   🎉 НАЙДЕН ПОДХОДЯЩИЙ ДЕПОЗИТ!`);
          console.log(`   ID: ${deposit._id}`);
          console.log(`   Пользователь: ${deposit.userId}`);
          console.log(`   Запрошенная сумма: ${deposit.amountRequested} DEL`);
          console.log(`   Уникальная сумма: ${deposit.uniqueAmount} DEL`);
        }
      }
      
      // Проверяем, была ли транзакция уже обработана
      const existingDeposit = await database.collection('deposits').findOne({
        txHash: txHash
      });
      
      if (existingDeposit) {
        console.log(`\n⚠️ Транзакция уже обработана!`);
        console.log(`   Депозит ID: ${existingDeposit._id}`);
        console.log(`   Статус: ${existingDeposit.matched ? 'matched' : 'waiting'}`);
        console.log(`   Подтверждения: ${existingDeposit.confirmations || 0}`);
      } else {
        console.log(`\n❌ Транзакция НЕ обработана!`);
        console.log(`   Возможные причины:`);
        console.log(`   - Сумма не совпадает с депозитом`);
        console.log(`   - Депозит истек`);
        console.log(`   - Ошибка в логике обработки`);
      }
    }
    
    console.log('\n✅ Проверка завершена');
    
  } catch (error) {
    console.error('❌ Ошибка проверки:', error);
  }
}

checkSpecificTransaction(); 