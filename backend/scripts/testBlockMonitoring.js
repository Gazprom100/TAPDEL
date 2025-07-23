const databaseConfig = require('../config/database');
const decimalService = require('../services/decimalService');
const config = require('../config/decimal');

async function testBlockMonitoring() {
  try {
    console.log('🔍 ТЕСТИРОВАНИЕ МОНИТОРИНГА БЛОКОВ');
    console.log('=====================================');
    
    // Подключаемся к базе данных
    const database = await databaseConfig.connect();
    console.log('✅ База данных подключена');
    
    // Инициализируем DecimalService
    if (!decimalService.web3) {
      await decimalService.initialize();
    }
    console.log('✅ DecimalService инициализирован');
    
    // Получаем текущий блок
    const currentBlock = await decimalService.web3.eth.getBlockNumber();
    console.log(`📊 Текущий блок: ${currentBlock}`);
    
    // Получаем последние 5 блоков
    console.log('\n📋 Последние 5 блоков:');
    for (let i = 0; i < 5; i++) {
      const blockNum = Number(currentBlock) - i;
      const block = await decimalService.web3.eth.getBlock(blockNum, true);
      
      if (block && block.transactions) {
        const transactionsToWorkingAddress = block.transactions.filter(tx => 
          tx.to && tx.to.toLowerCase() === config.WORKING_ADDRESS.toLowerCase()
        );
        
        console.log(`   Блок ${blockNum}: ${block.transactions.length} транзакций, ${transactionsToWorkingAddress.length} к рабочему адресу`);
        
        if (transactionsToWorkingAddress.length > 0) {
          transactionsToWorkingAddress.forEach((tx, index) => {
            const value = parseFloat(decimalService.web3.utils.fromWei(tx.value, 'ether'));
            console.log(`     TX ${index + 1}: ${value} DEL (${tx.hash})`);
          });
        }
      }
    }
    
    // Проверяем активные депозиты
    const activeDeposits = await database.collection('deposits').find({
      matched: false,
      expiresAt: { $gt: new Date() }
    }).toArray();
    
    console.log(`\n🔍 Активных депозитов: ${activeDeposits.length}`);
    activeDeposits.forEach((deposit, index) => {
      console.log(`   ${index + 1}. ${deposit.uniqueAmount} DEL (${deposit.userId})`);
    });
    
    // Проверяем, есть ли транзакции с нужными суммами
    console.log('\n🔍 Поиск транзакций с нужными суммами...');
    for (const deposit of activeDeposits) {
      console.log(`   Ищем транзакцию на ${deposit.uniqueAmount} DEL...`);
      
      // Проверяем последние 10 блоков
      for (let i = 0; i < 10; i++) {
        const blockNum = Number(currentBlock) - i;
        const block = await decimalService.web3.eth.getBlock(blockNum, true);
        
        if (block && block.transactions) {
          for (const tx of block.transactions) {
            if (tx.to && tx.to.toLowerCase() === config.WORKING_ADDRESS.toLowerCase()) {
              const value = parseFloat(decimalService.web3.utils.fromWei(tx.value, 'ether'));
              const roundedValue = Math.round(value * 10000) / 10000;
              const depositRounded = Math.round(deposit.uniqueAmount * 10000) / 10000;
              const EPSILON = 0.00005;
              
              if (Math.abs(roundedValue - depositRounded) <= EPSILON) {
                console.log(`   ✅ НАЙДЕНА! Блок ${blockNum}, TX: ${tx.hash}, Сумма: ${value} DEL`);
              }
            }
          }
        }
      }
    }
    
    // Проверяем настройки мониторинга
    console.log('\n⚙️ Настройки мониторинга:');
    console.log(`   Рабочий адрес: ${config.WORKING_ADDRESS}`);
    console.log(`   Подтверждения: ${config.CONFIRMATIONS}`);
    console.log(`   Интервал мониторинга: 10 секунд`);
    
    console.log('\n✅ Тестирование завершено');
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  }
}

testBlockMonitoring(); 