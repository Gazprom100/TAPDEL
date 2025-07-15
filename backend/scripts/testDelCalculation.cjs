const { Web3 } = require('web3');

// DecimalChain настройки
const RPC_URL = process.env.DECIMAL_RPC_URL || 'https://node.decimalchain.com/web3/';
const WORKING_ADDRESS = process.env.DECIMAL_WORKING_ADDRESS || '0x59888c4759503AdB6d9280d71999A1Db3Cf5fb43';

async function testDelCalculation() {
  try {
    console.log('🔍 ТЕСТИРОВАНИЕ РАСЧЕТА СУММ DEL');
    console.log('==================================\n');
    
    // Подключаемся к DecimalChain
    const web3 = new Web3(RPC_URL);
    console.log(`🌐 RPC URL: ${RPC_URL}`);
    console.log(`💼 Адрес кошелька: ${WORKING_ADDRESS}\n`);
    
    // Проверяем подключение
    const blockNumber = await web3.eth.getBlockNumber();
    console.log(`✅ Подключение к сети: блок #${blockNumber}`);
    
    // Тестируем различные суммы
    const testAmounts = [0.001, 1, 10, 100, 1000];
    
    console.log('\n📊 ТЕСТИРОВАНИЕ РАСЧЕТОВ:');
    console.log('='.repeat(50));
    
    for (const amount of testAmounts) {
      // Конвертируем в wei
      const amountWei = web3.utils.toWei(amount.toString(), 'ether');
      
      // Конвертируем обратно в DEL
      const amountBack = web3.utils.fromWei(amountWei, 'ether');
      
      console.log(`💰 ${amount} DEL:`);
      console.log(`   Wei: ${amountWei}`);
      console.log(`   Обратно: ${amountBack} DEL`);
      console.log(`   Совпадение: ${parseFloat(amountBack) === amount ? '✅' : '❌'}`);
      console.log('-'.repeat(30));
    }
    
    // Проверяем баланс рабочего кошелька
    console.log('\n💰 БАЛАНС РАБОЧЕГО КОШЕЛЬКА:');
    const balanceWei = await web3.eth.getBalance(WORKING_ADDRESS);
    const balanceDel = web3.utils.fromWei(balanceWei, 'ether');
    console.log(`   Wei: ${balanceWei}`);
    console.log(`   DEL: ${balanceDel}`);
    
    // Проверяем последние транзакции
    console.log('\n📋 ПОСЛЕДНИЕ ТРАНЗАКЦИИ:');
    const latestBlock = await web3.eth.getBlock(blockNumber, true);
    
    if (latestBlock.transactions) {
      const incomingTxs = latestBlock.transactions.filter(tx => 
        tx.to && tx.to.toLowerCase() === WORKING_ADDRESS.toLowerCase()
      );
      
      if (incomingTxs.length > 0) {
        console.log(`   Найдено входящих транзакций в блоке ${blockNumber}: ${incomingTxs.length}`);
        
        for (const tx of incomingTxs.slice(0, 3)) { // Показываем только первые 3
          const valueDel = web3.utils.fromWei(tx.value, 'ether');
          console.log(`   TX: ${tx.hash.substring(0, 10)}...`);
          console.log(`   От: ${tx.from}`);
          console.log(`   Сумма: ${valueDel} DEL (${tx.value} wei)`);
          console.log('   -'.repeat(20));
        }
      } else {
        console.log(`   Входящих транзакций в блоке ${blockNumber} не найдено`);
      }
    }
    
    // Проверяем несколько предыдущих блоков
    console.log('\n🔍 ПОИСК ТРАНЗАКЦИЙ В ПОСЛЕДНИХ БЛОКАХ:');
    for (let i = 0; i < 5; i++) {
      const blockNum = blockNumber - i;
      const block = await web3.eth.getBlock(blockNum, true);
      
      if (block.transactions) {
        const incomingTxs = block.transactions.filter(tx => 
          tx.to && tx.to.toLowerCase() === WORKING_ADDRESS.toLowerCase()
        );
        
        if (incomingTxs.length > 0) {
          console.log(`   Блок ${blockNum}: ${incomingTxs.length} входящих транзакций`);
          
          for (const tx of incomingTxs) {
            const valueDel = web3.utils.fromWei(tx.value, 'ether');
            console.log(`     ${valueDel} DEL от ${tx.from.substring(0, 10)}...`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('\n❌ ОШИБКА ТЕСТИРОВАНИЯ:');
    console.error(error.message);
  }
}

testDelCalculation().catch(console.error); 